import unittest
from unittest.mock import patch

import numpy as np

try:
    from backend import cosonasa_engine as engine
except ImportError:
    import cosonasa_engine as engine


class MembershipFunctionTests(unittest.TestCase):
    def test_trapezoid_left_and_right_shoulders_include_endpoints(self):
        values = engine.trapmf(np.array([0.0, 0.1, 0.2, 0.3, 0.4]), 0.0, 0.0, 0.2, 0.4)
        np.testing.assert_allclose(values, [1.0, 1.0, 1.0, 0.5, 0.0])

    def test_triangular_membership_has_expected_peak_and_support(self):
        values = engine.trimf(np.array([0.0, 0.25, 0.5, 0.75, 1.0]), 0.0, 0.5, 1.0)
        np.testing.assert_allclose(values, [0.0, 0.5, 1.0, 0.5, 0.0])

    def test_invalid_membership_breakpoints_are_rejected(self):
        with self.assertRaises(ValueError):
            engine.trapmf(0.5, 1.0, 0.0, 0.5, 1.0)
        with self.assertRaises(ValueError):
            engine.trimf(0.0, 0.0, 0.0, 1.0)

    def test_rule_table_contains_28_rules_and_covers_all_discrete_combinations(self):
        import itertools
        self.assertEqual(len(engine.REGLAS_COSONASA_28), 28)
        covered = [
            combination for combination in itertools.product((1, 2, 3), repeat=4)
            if any(all(rule_value == 0 or rule_value == value
                       for rule_value, value in zip(rule[:4], combination))
                   for rule in engine.REGLAS_COSONASA_28)
        ]
        self.assertEqual(len(covered), 81)
        score = engine.evaluar_cosonasa_28(0.5, 0.5, 0.5, 2.0)
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)


class DataIntegrityTests(unittest.TestCase):
    @patch.object(engine, "obtener_nombre_lugar", return_value={"nombre_corto": "Test field"})
    @patch.object(engine, "obtener_suelo_usda", return_value={
        "mukey": None, "textura": "Unavailable", "materia_organica_pct": None,
        "retencion_agua_awc": None, "factor_erosion_k": None,
        "fuente": "USDA SSURGO unavailable", "cobertura_verificada": False
    })
    @patch.object(engine, "obtener_agua_subterranea_usgs", return_value={"disponible": False})
    @patch.object(engine.requests, "get")
    def test_custom_field_missing_data_does_not_generate_fake_recommendations(
        self, mock_get, _water, _soil, _place
    ):
        class Response:
            def raise_for_status(self):
                pass
            def json(self):
                return {"properties": {"parameter": {}}}
        mock_get.return_value = Response()
        result = engine.ejecutar_modelo_predictivo_coordenadas(10.0, 10.0, cultivo_actual="Trigo")
        self.assertEqual(result["status"], "insufficient-data")
        self.assertEqual(result["rotation_strategies"], [])
        self.assertEqual(result["crop_ranking"], [])
        self.assertTrue(result["missing_data"])
        self.assertTrue(all(row["cultivo_principal"] is None for row in result["historical_series_10y"]))
        self.assertTrue(all(row["temp_max_c"] is None for row in result["historical_series_10y"]))

    @patch.object(engine.requests, "post")
    def test_ssurgo_uses_horizon_fields_and_depth_component_weighting(self, mock_post):
        class Response:
            def raise_for_status(self):
                pass
            def json(self):
                return {"Table": [
                    ["123", "Map unit", "c1", "Component 1", 60, 0, 10, 2.0, 0.2, ".3"],
                    ["123", "Map unit", "c1", "Component 1", 60, 10, 30, 1.0, 0.1, ".4"],
                    ["123", "Map unit", "c2", "Component 2", 40, 0, 30, 3.0, 0.3, ".2"],
                ]}
        mock_post.return_value = Response()
        soil = engine.obtener_suelo_usda(36.6, -120.1, {})
        query = mock_post.call_args.kwargs["json"]["query"]
        self.assertIn("h.om_r", query)
        self.assertIn("h.awc_r", query)
        self.assertIn("h.kffact", query)
        self.assertIn("h.cokey = c.cokey", query)
        self.assertNotIn("c.om_r", query)
        self.assertAlmostEqual(soil["materia_organica_pct"], 1.867, places=3)
        self.assertAlmostEqual(soil["retencion_agua_awc"], 0.2, places=3)
        self.assertAlmostEqual(soil["factor_erosion_k"], 0.3, places=3)
        self.assertTrue(soil["cobertura_verificada"])

    @patch.object(engine.requests, "post", side_effect=engine.requests.RequestException("SDA timeout"))
    def test_ssurgo_query_failure_is_exposed_for_diagnosis(self, _mock_post):
        soil = engine.obtener_suelo_usda(36.6, -120.1, {})
        self.assertIn("RequestException", soil["error_consulta"])
        self.assertFalse(soil["cobertura_verificada"])

    def test_custom_field_does_not_inherit_pilot_soil_profile(self):
        with patch.object(engine.requests, "post", side_effect=engine.requests.RequestException):
            soil = engine.obtener_suelo_usda(10.0, 10.0, {})
        self.assertIsNone(soil["materia_organica_pct"])
        self.assertIsNone(soil["retencion_agua_awc"])
        self.assertIsNone(soil["factor_erosion_k"])
        self.assertFalse(soil["cobertura_verificada"])
        self.assertIn("unavailable", soil["fuente"].lower())


if __name__ == "__main__":
    unittest.main()

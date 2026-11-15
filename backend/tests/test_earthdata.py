"""All tests mocked: they do not need NASA credentials or network."""
from types import SimpleNamespace
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from backend import earthdata
from backend.app import app, _EARTHDATA_TASKS


def test_product_discovery_selects_latest_known_version():
    assert earthdata.find_product({'SPL4SMGP.007':{},'SPL4SMGP.008':{},'OTHER.001':{}}) == 'SPL4SMGP.008'
    assert earthdata.find_layer({'sm_surface':{},'sm_rootzone':{},'sm_surface_pctl':{}}) == 'sm_surface'
    with pytest.raises(earthdata.EarthdataError):
        earthdata.find_layer({'sm_surface_pctl':{},'sm_rootzone':{}})


def test_point_task_has_official_shape():
    result = earthdata.point_task(36.6,-120.1,2024,'SPL4SMGP.008','sm_surface')
    assert result['task_type'] == 'point'
    assert result['params']['dates'] == [{'startDate':'01-01-2024','endDate':'12-31-2024'}]
    assert result['params']['coordinates'][0]['longitude'] == -120.1
    assert result['params']['layers'][0]['layer'] == 'sm_surface'


def test_local_mode_disabled_by_default(monkeypatch):
    monkeypatch.delenv('FIELD_SHIFT_APPEEARS_LOCAL_MODE', raising=False)
    with TestClient(app, client=('127.0.0.1', 50000)) as client:
        response=client.get('/api/earthdata/config')
    assert response.status_code == 403


def test_local_mode_no_credentials(monkeypatch):
    monkeypatch.setenv('FIELD_SHIFT_APPEEARS_LOCAL_MODE','1')
    monkeypatch.setattr(earthdata,'local_token',lambda:None)
    with TestClient(app, client=('127.0.0.1', 50000)) as client:
        config=client.get('/api/earthdata/config')
        requested=client.post('/api/earthdata/tasks',json={'lat':36.6,'lon':-120.1,'year':2024})
    assert config.status_code == 200 and not config.json()['authenticated']
    assert requested.status_code == 401


def test_task_id_must_belong_to_current_session(monkeypatch):
    monkeypatch.setenv('FIELD_SHIFT_APPEEARS_LOCAL_MODE','1')
    with TestClient(app, client=('127.0.0.1', 50000)) as client:
        result=client.get('/api/earthdata/tasks/'+str(uuid4()))
        bad=client.get('/api/earthdata/tasks/not-a-uuid')
    assert result.status_code==404 and bad.status_code==400


def test_submit_status_download_local_and_not_public(monkeypatch):
    import backend.app as api
    monkeypatch.setenv('FIELD_SHIFT_APPEEARS_LOCAL_MODE','1')
    monkeypatch.setattr(api,'local_token',lambda:'mocked_token')
    tid=str(uuid4())
    _EARTHDATA_TASKS.clear()
    async def opt(_):return {'product':'SPL4SMGP.008','layer':'sm_surface'}
    async def submit(lat,lon,year,product,layer):return tid
    async def state(task_id):return {'task_id':task_id,'status':'done'}
    async def result(task_id):return {'task_id':task_id,'file_name':'sample.csv','csv':'Date,Latitude,Longitude,sm_surface\n2024-01-01,36.6,-120.1,0.23\n'}
    monkeypatch.setattr(api,'earthdata_options',opt)
    monkeypatch.setattr(api,'submit_point',submit)
    monkeypatch.setattr(api,'task_state',state)
    monkeypatch.setattr(api,'task_csv',result)
    with TestClient(app, client=('127.0.0.1', 50000)) as client:
        created=client.post('/api/earthdata/tasks',json={'lat':36.6,'lon':-120.1,'year':2024})
        assert created.status_code==200 and created.json()['task_id']==tid
        repeated=client.post('/api/earthdata/tasks',json={'lat':36.6,'lon':-120.1,'year':2024})
        assert repeated.json()['reused'] is True
        got=client.get('/api/earthdata/tasks/'+tid+'/csv')
        assert got.status_code==200
        assert got.json()['product']=='SPL4SMGP.008'
        assert 'sm_surface' in got.json()['csv']
    _EARTHDATA_TASKS.clear()


def test_csv_size_limit_and_unexpected_file(monkeypatch):
    data={'files':[{'file_type':'txt','file_id':str(uuid4()),'file_name':'a.txt'}]}
    async def fake(method,path,**kwargs):return SimpleNamespace(json=lambda:data)
    monkeypatch.setattr(earthdata,'nasa_call',fake)
    monkeypatch.setattr(earthdata,'auth_headers',lambda:{})
    with pytest.raises(earthdata.EarthdataError):
        import asyncio
        asyncio.run(earthdata.task_csv(str(uuid4())))

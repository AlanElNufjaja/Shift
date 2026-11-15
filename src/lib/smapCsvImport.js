/** NASA AppEEARS point-sample CSV adapter.
 * Values must be volumetric surface moisture (m3/m3) for SPL4SMGP or SPL3SMP_E.
 * CSVs are user-supplied evidence, not independently verified by the app.
 * Never accept image colors, percentile ranks, MERRA-2 aliases, or demo fields.
 */
const PRODUCT_VARIABLES = {
  SPL4SMGP: ['sm_surface', 'sm_surface_analysis'],
  SPL3SMP_E: ['soil_moisture_am', 'soil_moisture_pm'],
};

function tokenizeCSV(text) {
  if (typeof text !== 'string' || text.length > 8_000_000) throw new Error('CSV is empty or exceeds the 8 MB limit.');
  const rows=[]; let row=[]; let part=''; let quoted=false;
  for (let i=0; i<text.length; i++) {
    const c=text[i];
    if (quoted) {
      if (c==='"' && text[i+1]==='"') {part+='"'; i++;}
      else if (c==='"') quoted=false;
      else part+=c;
    } else if (c==='"') quoted=true;
    else if (c===',') {row.push(part);part='';}
    else if (c==='\n' || c==='\r') {
      if(c==='\r' && text[i+1]==='\n') i++;
      row.push(part); part='';
      if(row.some(x=>x.trim())) rows.push(row);
      row=[];
    } else part+=c;
  }
  if(quoted) throw new Error('CSV contains an unfinished quoted field.');
  row.push(part);
  if(row.some(x=>x.trim())) rows.push(row);
  if(rows.length<2) throw new Error('CSV must include a header and at least one observation.');
  return rows;
}
const norm=s=>String(s).toLowerCase().replace(/^\ufeff/,'').trim().replace(/[\s.-]+/g,'_');
function fieldIndex(headers, names) {return headers.findIndex(h=>names.includes(norm(h)));}
export function inspectSmapCsv(text, product) {
  if(!PRODUCT_VARIABLES[product]) throw new Error('Choose an official supported SMAP product.');
  const rows=tokenizeCSV(text);
  const headers=rows[0].map(s=>s.replace(/^\ufeff/,'').trim());
  const variables=PRODUCT_VARIABLES[product];
  const candidates=headers.filter(h=>variables.some(v=>norm(h)===v || new RegExp(`^${product.toLowerCase()}_\\d{3}_(?:geophysical_data_)?${v}$`).test(norm(h))));
  if(!candidates.length) throw new Error(`No ${product} surface-moisture column found. Export sm_surface (L4) or soil_moisture_am/pm (L3) from AppEEARS.`);
  if(fieldIndex(headers,['date','datetime','date_time','time','timestamp'])<0) throw new Error('CSV needs a Date column.');
  if(fieldIndex(headers,['latitude','lat'])<0 || fieldIndex(headers,['longitude','lon','long'])<0) throw new Error('CSV needs Latitude and Longitude columns to verify the point.');
  return {headers,candidates,observations:rows.length-1};
}
function isoDate(raw) {
  const match=String(raw).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if(!match) return null;
  const [y,m,d]=match.slice(1).map(Number);
  const actual=new Date(Date.UTC(y,m-1,d));
  if(actual.getUTCFullYear()!==y || actual.getUTCMonth()!==m-1 || actual.getUTCDate()!==d) return null;
  return {year:y,month:m};
}
const isNumeric = value => value !== '' && Number.isFinite(Number(value));
export function parseSmapCsv({text,product,column,year,lat,lon}) {
  const {headers,candidates}=inspectSmapCsv(text,product);
  if(!candidates.includes(column)) throw new Error('Choose a valid moisture column from the selected product.');
  if(!Number.isInteger(year) || year<2015 || year>2026) throw new Error('Choose a supported observation year.');
  if(!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Field coordinates are missing.');
  const all=tokenizeCSV(text);
  const dateIndex=fieldIndex(headers,['date','datetime','date_time','time','timestamp']);
  const latIndex=fieldIndex(headers,['latitude','lat']);
  const lonIndex=fieldIndex(headers,['longitude','lon','long']);
  const valueIndex=headers.indexOf(column);
  const monthly=Array.from({length:12},()=>[]);
  let ignoredYear=0, missing=0, invalid=0, matched=0;
  for(const row of all.slice(1)) {
    if(row.length!==headers.length) throw new Error('CSV contains a row with the wrong number of columns.');
    const date=isoDate(row[dateIndex]);
    if(!date) throw new Error('All observation dates must use YYYY-MM-DD (optionally with a time).');
    const rowLat=Number(row[latIndex]),rowLon=Number(row[lonIndex]);
    if(!isNumeric(row[latIndex]) || !isNumeric(row[lonIndex]) || Math.abs(rowLat-lat)>0.15 || Math.abs(rowLon-lon)>0.15) {
      throw new Error('CSV contains coordinates farther than 0.15° from the selected field. Request a point sample for this field.');
    }
    if(date.year!==year) {ignoredYear++;continue;}
    matched++;
    const raw=row[valueIndex].trim();
    if(!isNumeric(raw) || [-999,-9999,-32768].includes(Number(raw))) {missing++;continue;}
    const v=Number(raw);
    // Basic physical bounds; no scaling is applied automatically.
    if(v<0 || v>0.8) {invalid++;continue;}
    monthly[date.month-1].push(v);
  }
  if(!matched) throw new Error(`CSV has no rows for ${year}. Choose the exported year.`);
  const months=monthly.map((values,i)=>({
    date:`${year}-${String(i+1).padStart(2,'0')}`,
    surface_volumetric:values.length?Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(4)):null,
    sample_count:values.length,
  }));
  const valid_months=months.filter(m=>m.sample_count>0).length;
  if(!valid_months) throw new Error('No valid numerical surface-moisture records in the selected year.');
  return {
    status:'ready', location:{lat,lon},period:{year},months,valid_months,
    source:{provider:'NASA Earthdata / AppEEARS (user-uploaded)',dataset:product,column,unit:'m³/m³',resolution_km_approx:9,
      verification:'User-declared dataset; not independently authenticated by Field Shift', type:'uploaded-csv'},
    audit:{matched_rows:matched,ignored_other_years:ignoredYear,missing_values:missing,out_of_range_values:invalid},
  };
}

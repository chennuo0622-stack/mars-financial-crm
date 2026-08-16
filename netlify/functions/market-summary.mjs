const toNum = (v) => { if (v===undefined||v===null||v===''||v==='None'||v==='null') return null; const n=Number(v); return Number.isFinite(n)?n:null; };
const json = (body) => new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json','cache-control':'public,max-age=300'}});
export default async () => {
  const now=new Date().toISOString(); const alphaKey=process.env.ALPHAVANTAGE_API_KEY;
  if(!alphaKey) return json({error:'ALPHAVANTAGE_API_KEY_NOT_SET',updatedAt:now,quotes:{},fundamentals:{},earnings:[],sources:[]});
  const symbols=['NVDA','MSFT','AAPL','AMZN','META','GOOGL'];
  const out={updatedAt:now,quotes:{},fundamentals:{},earnings:[],sources:['Alpha Vantage'],dataQuality:{quoteMode:'latest-trading-day-unless-realtime-entitlement-is-configured'}};
  const get=async(url)=>{const r=await fetch(url);if(!r.ok)throw new Error(`upstream HTTP ${r.status}`);return r.json();};
  try{
    for(const s of symbols){
      const q=await get(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(s)}&apikey=${alphaKey}`); const x=q['Global Quote']||{}; const price=toNum(x['05. price']);
      if(price!==null) out.quotes[s]={price,asOf:x['07. latest trading day']||null,source:'Alpha Vantage'};
      const e=await get(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(s)}&apikey=${alphaKey}`);
      if(e&&e.Symbol) out.fundamentals[s]={roe:toNum(e.ReturnOnEquityTTM),roic:toNum(e.ReturnOnInvestedCapitalTTM),pe:toNum(e.PERatio),epsGrowth:toNum(e.QuarterlyEarningsGrowthYOY),fcfGrowth:null,asOf:now,source:'Alpha Vantage OVERVIEW'};
    }
    const cal=await fetch(`https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey=${alphaKey}`); if(!cal.ok)throw new Error(`earnings calendar HTTP ${cal.status}`); const text=await cal.text();
    out.earnings=parseCsv(text).slice(1,31).filter(r=>r.length>2).map(r=>({symbol:r[0]||null,date:r[2]||null,estimate:r[5]||null,source:'Alpha Vantage'}));
  }catch(err){out.error='UPSTREAM_DATA_ERROR';out.errorDetail=String(err?.message||err);}
  return json(out);
};
function parseCsv(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&quoted&&n==='"'){field+='"';i++;continue}if(c==='"'){quoted=!quoted;continue}if(c===','&&!quoted){row.push(field);field='';continue}if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(field);field='';if(row.some(x=>x!==''))rows.push(row);row=[];continue}field+=c}if(field!==''||row.length){row.push(field);rows.push(row)}return rows}

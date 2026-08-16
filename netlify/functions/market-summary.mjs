export default async (req) => {
  const now = new Date().toISOString();
  const alphaKey = Netlify.env.get('ALPHAVANTAGE_API_KEY');
  if (!alphaKey) return new Response(JSON.stringify({error:'ALPHAVANTAGE_API_KEY_NOT_SET',updatedAt:now,quotes:{},fundamentals:{},earnings:[],sources:[]}),{status:200,headers:{'content-type':'application/json'}});
  const symbols=['NVDA','MSFT','AAPL','AMZN','META','GOOGL'];
  const out={updatedAt:now,quotes:{},fundamentals:{},earnings:[],sources:['Alpha Vantage']};
  const get=async (url)=>{const r=await fetch(url);if(!r.ok)throw new Error(`upstream ${r.status}`);return r.json()};
  try{
    for(const s of symbols){
      const q=await get(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${s}&apikey=${alphaKey}`);
      const x=q['Global Quote']||{};
      if(x['05. price'])out.quotes[s]={price:Number(x['05. price']),asOf:x['07. latest trading day']||now,source:'Alpha Vantage'};
      const e=await get(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${s}&apikey=${alphaKey}`);
      if(e && e.Symbol){out.fundamentals[s]={roe:Number(e.ReturnOnEquityTTM)/100,roic:Number(e.ReturnOnInvestedCapitalTTM)/100,pe:Number(e.PERatio),epsGrowth:Number(e.QuarterlyEarningsGrowthYOY),fcfGrowth:null,asOf:now,source:'Alpha Vantage OVERVIEW'};}
    }
    const cal=await fetch(`https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey=${alphaKey}`);const text=await cal.text();
    out.earnings=text.split('\n').slice(1,31).filter(Boolean).map(line=>{const p=line.split(',');return {symbol:p[0],date:p[2],estimate:p[5],source:'Alpha Vantage'}});
  }catch(err){out.error='UPSTREAM_DATA_ERROR';out.errorDetail=String(err.message||err)}
  return new Response(JSON.stringify(out),{status:200,headers:{'content-type':'application/json','cache-control':'public,max-age=300'}});
};
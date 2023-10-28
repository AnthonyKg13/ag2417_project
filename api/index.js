import express from 'express';
import bodyParser from 'body-parser';
import pg from "pg";


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


let allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'POST')
  res.header('Access-Control-Allow-Methods', 'GET')
  res.header('Access-Control-Allow-Headers', 'content-type')
  next()
}

app.use(allowCrossDomain)

app.get('/api', (req, res) => res.send('Hello World!'));

const { Pool } = pg;
const pool = new Pool({
  host:"localhost",
  port:5435,
  user:"ag2417_23_g5",
  password:"ag2417_23_g5_password",
  database:"ag2417_23"
});

//Create an api link to query data from database. Just change the SQL statements
//format: /api/{content}
function sendQuery(pathStr,sqlStr,strfun=null) {
  app.get(pathStr, async (req, res) => {
    //res.header("Access-Control-Allow-Origin","*");
      try {
        //const response = await pool.query('SELECT id,name,ST_AsGeoJSON(geom) FROM public.california_counties LIMIT 1');
        if (strfun==null) {} else {
          sqlStr = strfun(req);
        }
        const response = await pool.query(sqlStr);
        if(response){
          res.status(200).send(response.rows[0].json_build_object);
        }
        
      } catch (error) {
        res.status(500).send('Error');
        console.log(error);
      }
    });
}
function isDateValid(dateStr) {
  return !isNaN(new Date(dateStr));
}
//request counties
sendQuery(
  '/api/cacounties',
  `SELECT json_build_object( \
  'type', 'FeatureCollection', \
  'features',json_agg(ST_AsGeoJSON(t.*)::json)) \
  FROM ( \
    SELECT id,name,ST_Simplify(geom,600,true) FROM ag2417_23_g5.california_counties) \
    as t(id,name,geom);`) 

//request incidents
// example:
// http://localhost:3115/api/incidents?from=2018-10-30T11:00:00&to=2018-10-30T12:00:00
const cond_incidents_interval = (req) => {
  if (isDateValid(req.query.from)) {
    var live_datefrom = `'${req.query.from}'`; 
    //console.log(live_datefrom)
    //default: 1h
    //console.log(live_dateinterval)
  } else {
    live_datefrom = `(SELECT to_timestamp(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)-126226800))`
  }
  if (isDateValid(req.query.to)) {
    var live_dateto = `'${req.query.to}'`; 
    console.log(live_dateto)
    //default: 1h
    //console.log(live_dateinterval)
  } else {
    live_dateto = `(SELECT to_timestamp(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)-126223200))` //default: from now-1h to now
  }
  return `SELECT json_build_object( \
    'type', 'FeatureCollection', \
    'features',json_agg(ST_AsGeoJSON(t.*)::json)) \
    FROM ( \
SELECT incident_id, dot, description, geom_3857 \
FROM ag2417_23_g5.incidents \
WHERE \
trim(geom_3857)!='' AND \
dot <= (SELECT to_timestamp(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)-126144000)) AND \
dot <= ${live_dateto} AND \
dot >= ${live_datefrom} \
ORDER BY dot DESC) \
      as t(incident_id, dot, description, geom);`
}
sendQuery('/api/incidents','',cond_incidents_interval); //'126144000' = 4 years

/*
const cond_incidents_interval = (req) => {
  var live_dateinterval = req.query.interval
  if (live_dateinterval >= 0) {null} else {
    live_dateinterval = 0*86400+1*3600+0*60+0; //default: 1h
    //console.log(live_dateinterval)
    return `SELECT json_build_object( \
      'type', 'FeatureCollection', \
      'features',json_agg(ST_AsGeoJSON(t.*)::json)) \
      FROM ( \
  SELECT incident_id, dot, description, fwy_num, geom_3857 \
  FROM incidents \
  WHERE \
  trim(geom_3857)!='' AND \
  dot <= (SELECT to_timestamp(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)-126144000)) AND \
  dot >= (SELECT to_timestamp(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)-126144000-${live_dateinterval})) \
  ORDER BY dot DESC) \
        as t(incident_id,dot,description, fwy_num, geom);`
  }
}
//sendQuery('/api/incidents','',cond_incidents_interval); //'126144000' = 4 years
*/

//request highway
sendQuery('/api/hwy',`SELECT json_build_object(
  'type', 'FeatureCollection',
  'features',json_agg(ST_AsGeoJSON(t.*)::json))
  FROM (SELECT id,geom,routeid,county,city FROM ag2417_23_g5."HWY_National_Highway_System")
    as t(incident_id,dot,description, fwy_num, geom);`);

//request highway (large scale)
sendQuery('/api/hwy_largescale',`SELECT json_build_object(
  'type', 'FeatureCollection',
  'features',json_agg(ST_AsGeoJSON(t.*)::json))
  FROM (SELECT id,ST_Simplify(geom,3000,true) AS geom,routeid,county,city FROM ag2417_23_g5."HWY_National_Highway_System" WHERE routeid like 'SHS%')
    as t(incident_id,dot,description, fwy_num, geom);`);

//request incident aggregate/density on roads
sendQuery('/api/hwy_incident_agg',`SELECT json_build_object(
  'type', 'FeatureCollection',
  'features',json_agg(ST_AsGeoJSON(t.*)::json))
  FROM (SELECT * FROM ag2417_23_g5.hwy_incident_agg)
    as t(fid,len_m,aggr,geom,density);`);
//request user reported incidents
sendQuery('/api/userincident',`SELECT json_build_object(
  'type', 'FeatureCollection',
  'features',json_agg(ST_AsGeoJSON(t.*)::json))
  FROM (SELECT * FROM ag2417_23_g5.userincidents)
    as t(id,dot,description,geom);`);
//post request: report incidents
app.post('/api/sendreport', async (req, res) => {
  try {
    const postData = req.body;
    //console.log(postData.time)
    const type = postData.type;
    const time = postData.time;
    const lat  = postData.lat;
    const lng  = postData.lng;
    
    const response = await pool.query(`INSERT INTO ag2417_23_g5.userincidents(dot,description,geom) VALUES ('${time}','${type}',ST_Point(${lng},${lat},3857))
    `);
    if(response){
      res.status(200).send(req.body);
      //console.log(req.body)
    }
  } catch (error) {
    res.status(500).send('Error');
    console.log(error);
    }
});


app.listen(3115, () => console.log(`App running on port 3115.`));

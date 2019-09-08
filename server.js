const http = require('http'),
    https = require('https'),
    url = require('url'),
    qs = require('querystring')
    fs = require('fs');

const API_URL = 'https://c.y.qq.com/base/fcgi-bin/fcg_music_express_mobile3.fcg?';
const DL_URL = 'https://dl.stream.qqmusic.qq.com/';

var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
config.http.enable = config.http.enable || true;
config.http.host = config.http.host || '0.0.0.0';
config.http.port = config.http.port || 80;
config.https.enable = config.https.enable || false;
config.https.host = config.https.host || '0.0.0.0';
config.https.port = config.https.port || 443;
config.https.cert = config.https.cert || 'cert.pem';
config.https.cert_key = config.https.cert_key || 'key.pem';
config.cors = config.cors || '*';

var app = function(request, response){
    let query = url.parse(request.url, true).query || {},
        soundID = query.id,
        soundURL = ''
        _finish = function(err){
            if (err) {
                console.error(err);
            }
            response.setHeader('Access-Control-Allow-Origin', config.cors);
            if (soundURL != '') {
                if (query.callback) {
                    response.writeHead(200, {
                        'Content-Type': 'application/javascript'
                    });
                    response.end(`${query.callback}("${soundURL}")`);
                } else {
                    response.writeHead(200, {
                        'Content-Type': 'text/plain'
                    });
                    response.end(soundURL);
                }
            } else {
                response.writeHead(400, {
                    'Content-Type': 'text/html'
                });
                response.end(soundURL);
            }
        };
    if (soundID) {
        let filename = `C400${soundID}.m4a`,
            guid = Math.round(2147483647 * Math.random()) * (new Date).getUTCMilliseconds() % 1e10;
        https.get(API_URL + qs.stringify({
            format: 'json',
            cid: 205361747,
            uin: 0,
            songmid: soundID,
            filename: filename,
            guid: guid
        }), (res) => {
            let raw = '';
            res.on('data', chunk => {
                raw += chunk;
            });
            res.on('end', () => {
                try {
                    let data = JSON.parse(raw);
                    soundURL = DL_URL + filename + '?' + qs.stringify({
                        guid: guid,
                        vkey: data.data.items[0].vkey,
                        uin: 0,
                        fromtag: 66
                    });
                    _finish();
                } catch (err) {
                    _finish(err);
                }
            });
        }).on('error', err => {
            _finish(err);
        });
    } else {
        _finish();
    }
};

if (config.http.enable) {
    http.createServer(app).listen(config.http.port, config.http.host);
    console.log(`Http server is running at http://${config.http.host}:${config.http.port}`);
}
if (config.https.enable) {
    https.createServer({
        key: fs.readFileSync(config.https.cert_key),
        cert: fs.readFileSync(config.https.cert)
    }, app).listen(config.https.port, config.https.host);
    console.log(`Https server is running at https://${config.https.host}:${config.https.port}`);
}

/* Example (https://y.qq.com/n/yqq/song/001uaxks4G5JL9.html)
GET https://c.y.qq.com/base/fcgi-bin/fcg_music_express_mobile3.fcg?format=json&cid=205361747&uin=0&songmid=001uaxks4G5JL9&filename=C400001uaxks4G5JL9.m4a&guid=7359439225
{
    "code": 0,
    "cid": 205361747,
    "userip": "106.15.192.163",
    "data": {
        "expiration": 80400,
        "items": [
            {
                "subcode": 0,
                "songmid": "001uaxks4G5JL9",
                "filename": "C400001uaxks4G5JL9.m4a",
                "vkey": "21FF491753B6228C18DE6B0395AE793662BFECE300100965605FC0DF1014100D76724351BF97C009567FBC3E21D2540FCF5C5BDBBA149797"
            }
        ]
    }
}
*/

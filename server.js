const http = require('http'),
    https = require('https'),
    url = require('url'),
    fs = require('fs');

const API_URL = 'http://u.y.qq.com/cgi-bin/musicu.fcg?data=',
    DL_URL = 'https://dl.stream.qqmusic.qq.com/';

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
        soundURL = '',
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
        http.get(API_URL + JSON.stringify({
            _: {
                module: 'vkey.GetVkeyServer',
                method: 'CgiGetVkey',
                param: {
                    songmid: [soundID],
                    filename: [query.format == 'm4a' ? `C400${soundID}.m4a` : `M500${soundID}.mp3`],
                    guid: "0",
                    uin: "0"
                }
            }
        }), (res) => {
            let raw = '';
            res.on('data', chunk => {
                raw += chunk;
            });
            res.on('end', () => {
                try {
                    let data = JSON.parse(raw);
                    soundURL = DL_URL + data._.data.midurlinfo[0].purl.replace('&uin=0&fromtag=999', '');
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
GET http://u.y.qq.com/cgi-bin/musicu.fcg?data={"_":{"module":"vkey.GetVkeyServer","method":"CgiGetVkey","param":{"songmid":["001uaxks4G5JL9"],"filename":["M500001uaxks4G5JL9.mp3"],"guid":"0","uin":"0"}}}
{
    "_": {
        "data": {
            "expiration": 80400,
            "login_key": "",
            "midurlinfo": [
                {
                    "common_downfromtag": 0,
                    "errtype": "",
                    "filename": "M500001uaxks4G5JL9.mp3",
                    "flowfromtag": "",
                    "flowurl": "",
                    "hisbuy": 0,
                    "hisdown": 0,
                    "isbuy": 0,
                    "isonly": 0,
                    "onecan": 0,
                    "opi128kurl": "",
                    "opi192koggurl": "",
                    "opi192kurl": "",
                    "opi30surl": "",
                    "opi48kurl": "",
                    "opi96kurl": "",
                    "opiflackurl": "",
                    "p2pfromtag": 0,
                    "pdl": 0,
                    "pneed": 0,
                    "pneedbuy": 0,
                    "premain": 0,
                    "purl": "M500001uaxks4G5JL9.mp3?guid=0&vkey=98A47C2834A4211FF97529F8CAE2F6A8170C03A7BA2AE5F4090B6968E725A0C4366F2C4419D3ABC3DF207CF387E5580804EA2CB89784EB94&uin=0&fromtag=999",
                    "qmdlfromtag": 0,
                    "result": 0,
                    "songmid": "001uaxks4G5JL9",
                    "tips": "",
                    "uiAlert": 0,
                    "vip_downfromtag": 0,
                    "vkey": "98A47C2834A4211FF97529F8CAE2F6A8170C03A7BA2AE5F4090B6968E725A0C4366F2C4419D3ABC3DF207CF387E5580804EA2CB89784EB94",
                    "wififromtag": "",
                    "wifiurl": ""
                }
            ],
            "msg": "123.207.136.134",
            "retcode": 0,
            "servercheck": "75a3a702b4194e920b0470750c4bf38f",
            "sip": [],
            "testfile2g": "",
            "testfilewifi": "",
            "thirdip": [
                "",
                ""
            ],
            "uin": "",
            "verify_type": 0
        },
        "code": 0
    },
    "code": 0,
    "ts": 1568031470725
}
*/

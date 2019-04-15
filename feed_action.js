const request = require('request')
let _resolve, _reject

function main (msg) {
  console.dir(msg);
  let promise;
  _msg = msg;
  if (msg.lifecycleEvent === 'CREATE') {
    promise = new Promise( (resolve, reject) => {
      _resolve = resolve
      _reject = reject
      create(msg)
    })
  } else if (msg.lifecycleEvent === 'DELETE') {
    promise = new Promise( (resolve, reject) => {
      _resolve = resolve
      _reject = reject
      remove(msg)
    })
  } else if (msg.lifecycleEvent === 'READ') {
    promise = new Promise( (resolve, reject) => {
      _resolve = resolve
      _reject = reject
      get(msg)
    })
  }
  return (typeof promise !== 'undefined' ? promise : {done: true})
}

function create (msg) {
  if (!msg.hasOwnProperty('url') || !msg.hasOwnProperty('topic')) {
    _reject({done:true, error: 'Missing mandatory feed properties, must include url and topic.' })
  }

  const user_pass = msg.authKey.split(':')
  const body = {
    trigger: msg.triggerName,
    url: msg.broker_url || msg.url,  // if package has default broker url, use it. otherwise use one specified in trigger properties
    topic: msg.topic,
    clientid: msg.clientid,
    username: user_pass[0],
    password: user_pass[1]
  }
  console.dir(body)
  request({
    method: "POST",
    uri: msg.provider_endpoint,
    json: body
  }, handle_response)
}

function remove (msg) {
  request({
    method: "DELETE",
    uri: msg.provider_endpoint + msg.triggerName
  }, handle_response)
}

function get (msg) {
  request({
    method: "GET",
    uri: msg.provider_endpoint + msg.triggerName
  }, handle_response)
}

function handle_response (err, res, body) {
  if (!err && res.statusCode === 200) {
    console.log('mqtt feed: http request success.')

    if (_msg.lifecycleEvent === 'READ'){
      body = JSON.parse(body)
      result = {
        config: {
          name: body.trigger,
          url: body.url,
          topic: body.topic
        }
      };
    }else{
      result = {done: true}
    }

    _resolve(result)
  } 

  if(res) {
    console.log('mqtt feed: Error invoking provider: ', res.statusCode, body)
    _reject({done: true, error: 'mqtt feed: Error invoking provider: ' + res.statusCode + '\n' + JSON.stringify(body, null, 4)})
  } else {
    console.log('mqtt feed: Error invoking provider:', err);
    _reject ({done: true, error: 'mqtt feed: Error invoking provider: ' + err })
  }
}

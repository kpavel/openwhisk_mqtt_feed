const express = require('express')
const Cloudant = require('cloudant');
const FeedController = require('./lib/feed_controller.js')

// setup express for handling HTTP requests
const app = express()
const bodyparser = require('body-parser')
app.use(bodyparser.json())

let creds = {}
// extract cloudant credentials from environment
if (process.env.VCAP_SERVICES) {
  const appEnv = require('cfenv').getAppEnv()
  creds = appEnv.getServiceCreds(/cloudant/i)
} else if (process.env.CLOUDANT_USERNAME && process.env.CLOUDANT_PASSWORD){
  creds.username = process.env.CLOUDANT_USERNAME
  creds.password = process.env.CLOUDANT_PASSWORD
  creds.dbhost = process.env.CLOUDANT_HOST
  creds.apihost = process.env.API_HOST
}

if (!creds.username || !creds.password) {
  console.error('Missing cloudant credentials...')
  process.exit(1)
}

var url = "http://" + creds.username + ":" + creds.password + "@" + creds.dbhost + ":5984";
const cloudant = Cloudant(url);
const feed_controller = new FeedController(cloudant.db.use('topic_listeners'), creds.apihost)

feed_controller.initialise().then(() => {
  const handle_error = (err, message, res) => {
    console.log(message, err)
    res.status(500).json({ error: message})
  }

  app.post('/mqtt', function (req, res) {
    // trigger (namespace/name), url, topic, username, password
    feed_controller.add_trigger(req.body).then(() => res.send())
      .catch(err => handle_error(err, 'failed to add MQTT topic trigger', res))
  })

  app.delete('/mqtt/:namespace/:trigger', (req, res) => {
    feed_controller.remove_trigger(req.params.namespace, req.params.trigger).then(() => res.send())
      .catch(err => handle_error(err, 'failed to remove MQTT topic trigger', res))
  })

  app.listen(3000, function () {
    console.log('MQTT Trigger Provider listening on port 3000!')
  })
})

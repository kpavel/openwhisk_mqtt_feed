# openwhisk_mqtt_feed

[MQTT](http://mqtt.org/) package for [OpenWhisk](https://github.com/openwhisk/openwhisk), provides a topic subscriber feed. 

Messages received on the broker topic will be forwarded as [trigger activiations](https://github.com/openwhisk/openwhisk/blob/master/docs/triggers_rules.md#triggers).

This project provides the [feed action](https://github.com/openwhisk/openwhisk/blob/master/docs/actions.md), used to handle trigger registration and deletion events, along with the MQTT subscriber service. This backend service handles subscribing to MQTT messages for registered topics and executing the registered triggers when messages arrive.

## usage

``` $ wsk trigger create mqtt_trigger --feed /{USER_NAMESPACE}/mqtt/mqtt_feed -p topic 'TOPIC' -p url 'mqtt://BROKER_URL'``` 

_This feed is currently available for testing as a shared package on IBM Bluemix's OpenWhisk environment: **(/james.thomas@uk.ibm.com_dev/mqtt/mqtt_feed)**_

## deployment

Installing a new feed provider requires you to deploy the backend service, register the package and create the feed action. Users must have an account with an [OpenWhisk instance](https://new-console.ng.bluemix.net/openwhisk/) and followed the instructions to [setup their CLI](https://github.com/openwhisk/openwhisk/tree/master/docs#setting-up-openwhisk). [Cloudant](https://cloudant.com/) is used to persist trigger registration state by the backend service. Users need to register an account with this service provider.

### initialise database

Create this database in the CouchDB instance used by the application. 

* _topic\_listeners_

Add the following [Views](http://guide.couchdb.org/draft/views.html) to the _subscriptions_ design document.

```
{
  "_id": "_design/subscriptions",
  "views": {
    "host_topic_counts": {
      "reduce": "_sum",
      "map": "function (doc) {\n  emit(doc.url + '#' + doc.topic, 1);\n}"
    },
    "host_topic_triggers": {
      "map": "function (doc) {\n  emit(doc.url + '#' + doc.topic, {trigger: doc._id, username: doc.username, password: doc.password});\n}"
    },
    "all": {
      "map": "function (doc) {\n  emit(doc._id, doc.url + '#' + doc.topic);\n}"
    },
    "host_triggers": {
      "map": "function (doc) {\n  emit(doc.url, {trigger: doc._id, username: doc.username, password: doc.password});\n}"
    }
  }
}
```

### deploy service provider

Docker is used to build and deploy the service provider.

```
$ docker build -t user_name/mqtt_feed_provider .
$ docker run -e CLOUDANT_USERNAME='username' -e CLOUDANT_PASSWORD='password' -p 3000:3000 user_name/mqtt_feed_provider
```

This image can be deployed to [IBM Containers](https://console.ng.bluemix.net/docs/containers/container_index.html) service. The application is configured to register any [bound service credentials](https://new-console.ng.bluemix.net/docs/containers/container_creating_ov.html#container_binding) for Cloudant, rather than having to set environment variables manually.

```
$ docker tag user_name/mqtt_feed_provider registry.ng.bluemix.net/user_name/mqtt_feed_provider
$ docker push registry.ng.bluemix.net/user_name/mqtt_feed_provider
$ cf ic run -p 3000 -e "CCS_BIND_SRV=cloudant_instance" --name mqtt_feed_provider registry.ng.bluemix.net/user_name/mqtt_feed_provider
$ cf ic ip request
$ cf ic ip bind <ip_address> mqtt_feed_provider
```

Use the container's public IP address as the provider_endpoint parameter in the next section.

### create package

```
$ wsk package create -p provider_endpoint "http://<ip_address>:3000/mqtt" mqtt
```

### register feed action

```
$ wsk action create mqtt/mqtt_feed feed_action.js -a feed true
```

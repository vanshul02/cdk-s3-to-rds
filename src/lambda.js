const AWS = require('aws-sdk');
const csv = require('csvtojson');
const S3 = new AWS.S3();
const axios = require('axios'); // or https 

const sliceIntoChunks = (arr, chunkSize) => {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
}

const options = {
  headers: { "content-type": "application/json" }
}

const apiLinkDB = 'https://s3tordsapi.onrender.com/users/addBatch';
const apiLinkJWT = 'https://s3tordsapi.onrender.com/jwt';

exports.handler = async (event) => {
  console.log('Record: %s', event.Records[0]);
  console.log('Event Name: %s', event.Records[0].eventName);
  console.log('S3 Request: %j', event.Records[0].s3);
  console.log('S3 Request Key: %s', event.Records[0].s3.object.key);
  console.log('S3 Bucket Name: %s', event.Records[0].s3.bucket.name);
  const params = {
    Bucket: event.Records[0].s3.bucket.name,
    Key: event.Records[0].s3.object.key
  };
  const stream = S3.getObject(params).createReadStream();
  const json = await csv().fromStream(stream);
  const token = await axios({
    method: 'get',
    url: apiLinkJWT,

  }).then(async (response) => {
    console.log('RESPONSE: ', response)
;    const numOfBatches = json.length / 100;
    const batchesArray = sliceIntoChunks(json, 100);
    let axiosArray = []
    for (let x = 0; x < numOfBatches; x++) {
      let newPromise = axios({
        method: 'post',
        url: apiLinkDB,
        data: batchesArray[x],
        headers: {
          'token_header' : response.data,
        }
      })
      axiosArray.push(newPromise)
    }

    const res = await axios
      .all(axiosArray)
      .then(axios.spread((...responses) => {
        responses.forEach(res => console.log('Success'))
        console.log('submitted all axios calls');
      }))
      .catch(error => { });
    console.log(json);
    console.log(res);
  });
};
var startTime, endTime;

module.exports.start = function() {
  startTime = new Date();
};

module.exports.end = function() {
  endTime = new Date();
  var timeDiff = endTime - startTime; //in ms
  // strip the ms
  timeDiff /= 1000;

  // get seconds
  var seconds = Math.round(timeDiff);
  return seconds;
}

(function () {
    var beatDetectWorker = function () {

        var INITIAL_THRESHOLD = 0.9;
        var MIN_THRESHOLD = 0.3;
        var MIN_PEAKS = 30;

        onmessage = function (e) {

            var bufferData = e.data.bufferData;
            var sampleRate = e.data.sampleRate;

            var peaks;
            var threshold = INITIAL_THRESHOLD;

            do {
                peaks = getPeaksAtThreshold(bufferData, threshold, sampleRate / 1000);
                threshold -= 0.05;
            }
            while (peaks.length < MIN_PEAKS && threshold >= MIN_THRESHOLD);
            postMessage(peaks);
        };

        function getPeaksAtThreshold(data, threshold, sr) {
            var peaksArray = [];
            for (var i = 0; i < data.length;) {
                if (data[i] > threshold) {
                    peaksArray.push(Math.floor(i / sr));
                    i += 10000;
                }
                i++;
            }
            return peaksArray;
        }
    };

    var blobURL = URL.createObjectURL(new Blob(
        ['(', beatDetectWorker.toString(), ')()'],
        {type: 'application/javascript'}
    ));

    var worker = new Worker(blobURL);

    URL.revokeObjectURL(blobURL);

    var offlineContext = new ( window.OfflineAudioContext || window.webkitOfflineAudioContext )(1, 2, 44100);

    function beatworker(url, callback) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function (e) {
            offlineContext.decodeAudioData(e.target.response,
                function (buffer) {
                    worker.postMessage({
                        bufferData: buffer.getChannelData(0),
                        sampleRate: buffer.sampleRate
                    });
                });
        };
        request.send();
        worker.onmessage = function (event) {
            callback(event.data);
        };
    }

    window.beatworker = beatworker;

})();

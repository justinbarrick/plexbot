var metrics = require('./metrics');

var providers = {
    'tv': require('./providers/sonarr'),
    'movie': require('./providers/couchpotato'),
}

function create_attachment(result) {
    return {
        title: '<http://www.imdb.com/title/' + result.imdbid + "|" + result.title + "> (" + result.year + ")",
        text: result.description.slice(0, 250) + "...",
        thumb_url: result.image,
        name: result.title,
        callback_id: 'add_show',
        actions: [
            {
                name: 'Add show',
                text: 'Add show',
                value: result.tvdbid,
                type: 'button'
            }
        ]
    };
};

module.exports.searchHandler = function(bot, message) {
    var type = message.match[1];
    var search = message.match[2];

    var attachments = [];
    var callbacks = [];

    metrics.searches_count.labels(type).inc();

    bot.startConversation(message, function(err, convo) {
        providers[type].search(search).then(function(results) {
            results.forEach(function(result) {
                attachments.push(create_attachment(result));

                callbacks.push({
                    pattern: result.tvdbid,
                    callback: function(reply, convo) {
                        metrics.added_count.labels(type).inc();
                        console.log("my callback for " + result.title);
                        convo.gotoThread(result.tvdbid);
                    }
                });

                convo.addMessage({
                    text: "Adding " + result.title + "..."
                }, result.tvdbid);
            });
        });

        convo.addQuestion({ attachments: attachments }, callbacks);
        convo.activate();
    });

    metrics.completed_searches_count.labels(type).inc();
};

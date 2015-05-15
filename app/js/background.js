/*
chrome.browserAction.onClicked.addListener(function() {
	console.log("Background!", "onClick", chrome.runtime);

	chrome.browserAction.setPopup({
		popup: 'popup.html'
	});
	
});
*/

var Background = (function(){
	var init= function(){
		var LocalStorageAdapter = function(){
			
		};
		var adapter = new LocalStorageAdapter();
		
		LocalStorageAdapter.prototype.get = function(){
			chrome.storage.local.get(null, function(items){
				notifier.init(items);
			});
		};

		var Notifier = function(){
			this.shows = [];
			adapter.get();
		};
		var notifier = new Notifier();

		Notifier.prototype.init = function(shows){
			var that = this;
			_.each(shows, function(element, index, list){
				if(element.id > 0){
					that.shows.push(element);
				}
			});

			var showsThisWeek = {},
				numOfShowsThisWeek = 0,
				now = Date.now();

			if(this.shows.length > 0){
				_.each(this.shows, function(show, showIndex, showList){
					var soonest = now,
						date = null,
						nextEpisode = null,
						day = null;
					_.each(show.seasons, function(season, seasonIndex, seasonList){
						_.each(season.episodes, function(episode, episodeIndex, episodeList){
							var episodeDate = new Date(episode.date);
							if((episodeDate.getTime() - now < soonest) && (episodeDate.getTime() - now > 0)){
								soonest = episodeDate.getTime() - now;
								nextEpisode = episode;
								var key = show.id;
								showsThisWeek[show.id] = new Date(nextEpisode.date);
							}
						});
					});
				});

				_.each(showsThisWeek, function(value, key, list){
					if((!_.isNull(value)) && (value.getTime() < (now + 518400000))){
						numOfShowsThisWeek++;
					}
				});

				var badges = "";
				if(numOfShowsThisWeek > 0){
					badges += numOfShowsThisWeek;
				}
				chrome.browserAction.setBadgeText({
					text: badges
				});
			}
		};
	};
	return {
		init: init
	};
})();

Background.init();
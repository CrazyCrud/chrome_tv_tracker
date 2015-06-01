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

			var datesThisWeek = {},
				showsThisDay = {},
				numOfdatesThisWeek = 0,
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
								datesThisWeek[show.id] = {
									nextDate: new Date(nextEpisode.date),
									episode: episode,
									show: show
								};
							}
						});
					});
				});

				_.each(datesThisWeek, function(value, key, list){
					if((!_.isNull(value)) && (value.nextDate.getTime() < (now + 518400000))){
						numOfdatesThisWeek++;

						if((value.nextDate.getTime() < (now + 86400000))){
							showsThisDay[value.show.id] = value.show;
						}
					}
				});

				var badges = "";
				if(numOfdatesThisWeek > 0){
					badges += numOfdatesThisWeek;
				}
				chrome.browserAction.setBadgeText({
					text: badges
				});

				var notification = "";
				if(!_.isEmpty(showsThisDay)){
					var singular = true;
					var i = 0;
					_.each(showsThisDay, function(value, key, index){
						if(i > 0){
							singular = false;
							notification += "and " + value.name + " ";
						}else{
							notification += value.name + " ";
						}
						i++;
					});

					if(!singular){
						notification += "are continuing in less than 24 hours";
					}else{
						notification += "is continuing in less than 24 hours";
					}
					chrome.notifications.create({
						type: "basic",
						iconUrl: "assets/favicon-128.png",
						title: "Brace Yourself",
						message: notification
					});
				}
			}
		};
	};
	return {
		init: init
	};
})();

Background.init();
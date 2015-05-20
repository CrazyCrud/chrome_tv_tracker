var Watchnext = (function(){
	var _key = 'eb2f22e12032ae1141522496ebbcce55',
	_currentRequest = null,
	_state = -1,
	_isSearching = false,
	_elements = {
		body: $("body"),
		mainSection: $("section.main-section"),
		seriesList: $(".list-series")
	},
	init = function(){
		var ErrorMsg = function(){
			this.msgs = {
				0: "I'm sorry, an error occured, try to restart the application again",
				1: ""
			};
		};
		var errorMsg = new ErrorMsg();

		ErrorMsg.prototype.createMsg = function(number, error){
			var msg = this.msgs[0];
			if(!_.isNull(number) && !_.isUndefined(number)){
				msg += this.msgs[number];
			}
			if(!_.isNull(error) && !_.isUndefined(error)){
				msg += "</br><em>" + error + "</em>";
			}
			return msg;
		};

		/* Localstorage adapter */
		var LocalStorageAdapter = function(){
			
		};
		var adapter = new LocalStorageAdapter();

		LocalStorageAdapter.prototype.save = function(obj){
			var key = obj.id;
			var data = {};
			data[key] = obj;
			if(obj.id > 0){
				chrome.storage.local.set(data, function() {
					mainView.deactivateOverlay();
				});
			}else{
				chrome.storage.local.set(data, function() {

				});
			}
			
		};
		
		LocalStorageAdapter.prototype.get = function(id, callback){
			if(_.isNull(id)){
				chrome.storage.local.get(id, function(items){
					seriesCollection.populateView(items);
				});
			}else{
				chrome.storage.local.get({'id': id}, function(item){
					seriesCollection.populateView(items);
				});
			}
		};

		LocalStorageAdapter.prototype.remove = function(id){
			chrome.storage.local.remove(id);
		};

		LocalStorageAdapter.prototype.clear = function(){
			chrome.storage.local.clear();
		};

		LocalStorageAdapter.prototype.update = function(id){
			// todo
		};


		/* Saved series */
		function EpisodeModel(attrs){
			this.id = attrs.id || null;
			this.name = attrs.name || null;
			this.number = attrs.number || null;
			this.date = attrs.date || null;
			this.watched = attrs.watched || false;
			this.seriesId = attrs.seriesId || null;
			this.seasonId = attrs.seasonId || null;
		}

		EpisodeModel.prototype.toggle = function(){
			this.watched = !this.watched;
		};

		function SeasonModel(attrs){
			this.id = attrs.id || null;
			this.number = attrs.number || null;
			this.episodeCount = attrs.episodeCount || null;
			this.seriesId = attrs.seriesId || null;
			this.episodes = [];
		}

		function SeriesModel(attrs){
			this.id = attrs.id || null;
			this.name = attrs.name || null;
			this.image = attrs.image || null;
			this.date = attrs.date || null;
			this.numberOfEpisodes = attrs.numberOfEpisodes || null;
			this.currentSeason = attrs.currentSeason || -1;
			this.inProduction = attrs.inProduction || false;
			this.seasons = [];
		}


		function SeriesCollection(){
			this.series = [];
			this.episodesUpdated = false;
			this.seasonsUpdated = false;
			this.showsToUpdate = 0;
			this.numOfShowsUpdated = 0;
			this.showsUpdated = [];

			adapter.get(null, null);
		}
		var seriesCollection = new SeriesCollection();

		SeriesCollection.prototype.add = function(show){
			var index = _.sortedIndex(this.series, show, 'name');	
			//this.series.push(show);
			this.series.splice(index, 0, show);
		};

		SeriesCollection.prototype.save = function(show){
			_.each(show.seasons, function(element, index, list){
				element.episodes = _.sortBy(element.episodes, 'number');
			});
			this.add(show);
			adapter.save(show);
		};

		SeriesCollection.prototype.remove = function(seriesId){
			var index = _.findIndex(this.series, function(element){
				return element.id == seriesId;
			});

			if(index > -1){
				this.series.splice(index, 1);
			}
		};

		SeriesCollection.prototype.clear = function(show){
			this.series = [];
		};

		SeriesCollection.prototype.get = function(which){
			return this[which];
		};

		SeriesCollection.prototype.populateView = function(data){
			var that = this;
			var lastUpdate = null;

			if(_.has(data, 'message')){
				console.log(data.message);
				$('.main-section').html(errorMsg.createMsg(null, data.message));
				return;
			}

			_.each(data, function(element, index, list){
				if(element.id > 0){
					that.add(element);
				}else{
					lastUpdate = new Date(element.lastUpdate);
				}
			});

			if(_.isNull(lastUpdate)){
				adapter.save({
					id: -1,
					lastUpdate: new Date( ).toDateString()
				});
				seriesListView.render();
			}else{
				that.updateShowsInProduction(lastUpdate);
			}
		};

		SeriesCollection.prototype.updateShowsInProduction = function(lastUpdate){
			var that = this;
			var now = Date.now();
			var past = new Date(lastUpdate).getTime();
			if(Math.abs(now - past) > 518400000){
				mainView.activateOverlay();
				that.showsToUpdate = _.where(that.series, {inProduction: true}).length;
				_.each(this.series, function(element, index, list){
					if(element.inProduction){
						that.updateShowInProduction(element);
					}
				});
			}else{
				seriesListView.render();
			}
		};

		SeriesCollection.prototype.updateShowInProduction = function(show){
			var that = this;
			var url = "http://api.themoviedb.org/3/tv/" + show.id + "?api_key=" + _key;
			
			$.get(url, function(data) {
				var seasons = data.seasons;
				if(seasons[0].season_number === 0){
					seasons.splice(0, 1); // season 0 does not exist in reality
				}

				if(show.inProduction !== data.in_production){
					show.inProduction = data.in_production;	
					adapter.save(show);
				}
				
				if(show.seasons.length < 1){
					seriesListView.render();
					return;
				}

				var numOfLatestEpisodes = show.seasons[show.seasons.length - 1].episodes.length;
				var latestSeason = show.seasons[show.seasons.length - 1].number;

				// fetch new episodes
				if(seasons[latestSeason - 1].episode_count > numOfLatestEpisodes){
					var episodeRequests = [];
					for(var i = numOfLatestEpisodes + 1; i <= seasons[latestSeason - 1].episode_count; i++){
						episodeRequests.push(that.createAjax(show, latestSeason, i));
					}
					$.when.apply($, episodeRequests).done(function(){
						$.each(arguments, function(i, data) {
							data = data[0];
							var episode = new EpisodeModel({
								id: data.id,
								name: data.name,
								date: data.air_date,
								seriesId: show.id,
								seasonId: show.seasons[show.seasons.length - 1].id,
								number: data.episode_number
							});
							show.seasons[show.seasons.length - 1].episodes.push(episode);
						});
						that.showsUpdated.push(show.id);
						show.seasons[show.seasons.length - 1].episodeCount = seasons[latestSeason - 1].episode_count;
						that.updateFinished(true, that.seasonsUpdated);
						// updated episodes
					});
				}else{
					that.updateFinished(true, that.seasonsUpdated);
				}

				// fetch new seasons
				if(seasons.length > show.seasons.length){
					var episodeRequests = [];
					for(var i = show.seasons.length; i < seasons.length; i++){
						var season = new SeasonModel({
							id: seasons[i].id,
							number: seasons[i].season_number,
							episodeCount: seasons[i].episode_count,
							seriesId: show.id,
							episodes: []
						});
						show.seasons.push(season);
					}

					for(var j = latestSeason; j < show.seasons.length; j++){
						for(var i = 1; i <= seasons[j].episode_count; i++){
							episodeRequests.push(that.createAjax(show, j + 1, i));
						}
					}

					$.when.apply($, episodeRequests).done(function(){
						var seasonCounter = latestSeason - 1;
						$.each(arguments, function(i, data) {
							data = data[0];
							if(data.episode_number === 1){
								seasonCounter++;
							}
							var episode = new EpisodeModel({
								id: data.id,
								name: data.name,
								date: data.air_date,
								seriesId: show.id,
								seasonId: seasons[seasonCounter].id,
								number: data.episode_number
							});
							show.seasons[seasonCounter].episodes.push(episode);
						});
						that.showsUpdated.push(show.id);
						that.updateFinished(that.episodesUpdated, true);
						// updated seasons
					});
				}else{
					that.updateFinished(that.episodesUpdated, true);
				}
			});
			this.numOfShowsUpdated++;
		};

		SeriesCollection.prototype.updateFinished = function(areEpisodesUpdated, areSeasonsUpdated){
			var that = this;
			this.episodesUpdated = areEpisodesUpdated;
			this.seasonsUpdated = areSeasonsUpdated;

			if(this.episodesUpdated && this.seasonsUpdated && (this.numOfShowsUpdated >= this.showsToUpdate)){
				this.showsUpdated = _.uniq(this.showsUpdated);
				_.each(this.showsUpdated, function(element, index, list){
					var show = _.find(that.series, function(elem){
						return elem.id === element;
					});
					if(_.isUndefined(show)){
						return;
					}
					adapter.save(show);
				});
				if(this.showsUpdated.length < 1){
					mainView.deactivateOverlay();
				}
				adapter.save({
					id: -1,
					lastUpdate: new Date( ).toDateString()
				});
				seriesListView.render();
			}else{
				mainView.deactivateOverlay();
			}
		};

		SeriesCollection.prototype.createAjax = function(series, seasonNumber, episodeNumber){
			var url = "http://api.themoviedb.org/3/tv/" + series.id + "/season/" + seasonNumber + "/episode/" + episodeNumber + "?api_key=" + _key;
			return $.get(url);
		};

		SeriesCollection.prototype.update = function(show){
			adapter.save(show);
		};

		SeriesCollection.prototype.updateWatchedStatus = function(seriesId, seasonIndex, episodeIndex, yep){
			var that = this;
			
			var show = _.find(this.series, function(element){
				return seriesId == element.id;
			});

			if(_.isUndefined(show)){
				return;
			}

			show.seasons[seasonIndex].episodes[episodeIndex].watched = yep;
			show.currentSeason = seasonIndex + 1;		
			this.update(show);
		};

		
		var MainView = function(){
			var that = this;
			this.element = $("section.main-section");
			this.backToMain = $("#back-to-main");

			this.backToMain.on('click', function(event) {
				event.preventDefault();
				if(!_.isNull(_currentRequest)){
					_currentRequest.abort();
				}
				searchView.get("element").val("");
				
				if(_state > -1 && _isSearching === true){
					var series = _.find(seriesCollection.get("series"), function(element){
						return _state == element.id;
					});

					if(_.isUndefined(series)){
						series = new SeriesModel();
					}

					var detailView = new DetailView({
						model: series
					});
					detailView.render();
				}else{
					seriesListView.render();
				}
				
			});

			$("body").on('click', '.delete-final', function(event) {
				var seriesId = $(this).attr('id');
				var item = that.element.find('li#' + seriesId);
				item.remove();
				that.deactivateOverlay();
				seriesCollection.remove(seriesId);
				adapter.remove(seriesId);
			});
			$("body").on('click', '.delete-abort', function(event) {
				that.deactivateOverlay();
			});
		};
		var mainView = new MainView();

		MainView.prototype.render = function(content){
			this.element.html(content);
		};

		MainView.prototype.getElement = function(){
			return this.element;
		};

		MainView.prototype.toggleNavigation = function(visible){
			if(visible){
				this.backToMain.removeClass('mui-hide');
			}else{
				if(!this.backToMain.hasClass('mui-hide')){
					this.backToMain.addClass('mui-hide');
				}
			}
		};

		MainView.prototype.activateOverlay = function(){
		    var modalEl = document.createElement('div');
		    modalEl.style.width = '43px';
		    modalEl.style.height = '11px';
		    modalEl.style.margin = '100px auto';

		    modalEl.innerHTML = "<img src='assets/loading.gif'/>";

		    mui.overlay('on', {
		    	'keyboard': false,
		    	'static': true
		    }, modalEl);
		};

		MainView.prototype.deactivateOverlay = function(){
			if($("body").hasClass('mui-overlay-on')){
				mui.overlay('off');
			}
		};


		var SeriesListView = function(options){
			var that = this;
			this.template = _.template($("#template-series-list").html());
			this.controller = options.controller || null;
			this.model = options.model || null;
			this.collection = options.collection || null;

			mainView.getElement().on('click', '.delete', function(event) {
				event.preventDefault();
				var item = $(this).parents('li');

				that.delete(item);
			});

			mainView.getElement().on('click', '.details', function(event) {
				event.preventDefault();
				var seriesId = $(this).parents('li').attr('id');
				var index = _.findIndex(that.collection.get("series"), function(element){
					return seriesId == element.id;
				});

				if(index === -1){
					return;
				}

				var series = that.collection.get("series")[index];
				that.showDetails(series);
			});
		};
		var seriesListView = new SeriesListView({'collection': seriesCollection});

		SeriesListView.prototype.render = function(){
			mainView.toggleNavigation(false);
			mainView.render(this.template({seriesList: this.collection.get("series")}));

			var showsThisWeek = $(".continues-this-week").length;
			var badges = "";
			if(showsThisWeek > 0){
				badges += showsThisWeek;
			}
			
			chrome.browserAction.setBadgeText({
				text: badges
			});
			
			
			_state = -1;
			_isSearching = false;
		};

		SeriesListView.prototype.delete = function(item){
			var seriesId = item.attr('id');
			var index = _.findIndex(this.collection.get("series"), function(element){
				return seriesId == element.id;
			});
			var series = _.find(this.collection.get("series"), function(element){
				return seriesId == element.id;
			});
			var name = "";
			if(!_.isNull(series)){
				name = series;
			}
			this.confirmDialog(seriesId, series.name);
			/*
			item.remove();
			this.collection.remove(seriesId);
			adapter.remove(seriesId);
			*/
		};
		SeriesListView.prototype.confirmDialog = function(seriesId, name){
			var that = this;
			var modalEl = document.createElement('div');
		    modalEl.style.width = '240px';
		    modalEl.style.height = '120px';
		    modalEl.style.margin = '100px auto';

		    var deleteButton = $("<button></button>");
		    deleteButton.attr('id', seriesId);
		    deleteButton.addClass('mui-btn mui-btn-danger delete-final');
		    deleteButton.html("Delete");
		    

		    var abortButton = $("<button></button>");
		    abortButton.addClass('mui-btn mui-btn-primary delete-abort');
		    abortButton.html("Abort");

		    var content = $("<div></div>");
		    content.addClass('dialog');
		    content.append("<p>Are you sure you want to delete " + name + "?</p>");
		    content.append(deleteButton);
		    content.append(abortButton);

		    modalEl.innerHTML = $("<div />").append($(content).clone()).html();

		    mui.overlay('on', {
		    	'keyboard': true,
		    	'static': false
		    }, modalEl);
		};

		SeriesListView.prototype.showDetails = function(series){
			var detailView = new DetailView({
				model: series
			});
			detailView.render();
		};

		var DetailView = function(options){
			var that = this;
			this.template = _.template($("#template-details").html());
			this.controller = options.controller || null;
			this.model = options.model || null;
			this.collection = options.collection || null;
			this.messages = {
				normal: "Show Episodes", expanded: "Hide Episodes"
			};
			this.pathDef = 'M16.667,62.167c3.109,5.55,7.217,10.591,10.926,15.75 c2.614,3.636,5.149,7.519,8.161,10.853c-0.046-0.051,1.959,2.414,2.692,2.343c0.895-0.088,6.958-8.511,6.014-7.3 c5.997-7.695,11.68-15.463,16.931-23.696c6.393-10.025,12.235-20.373,18.104-30.707C82.004,24.988,84.802,20.601,87,16';
			this.animDef = {
				speed : 0.2, easing : 'ease-in-out'
			};
		};

		DetailView.prototype.render = function(){
			mainView.toggleNavigation(true);
			mainView.render(this.template({series: this.model}));

			this.applyEvents();
			this.applyCheckboxStyle();
			this.checkWatchedEpisodes();
			this.expandCurrentSeasons();


			_state = this.model.id;
			_isSearching = false;
		};

		DetailView.prototype.applyEvents = function(){
			var that = this;
			$(".expand").on('click', function(event) {
				$(this).html(that.messages.normal);
				var listItem = $(this).parents('.single-season');
				listItem.toggleClass('expand');
				if(listItem.hasClass('expand')){
					$(this).html(that.messages.expanded);
				}
				listItem.siblings().removeClass('expand');

				listItem.siblings().find('.expand').each(function(index, el) {
					$(el).html(that.messages.normal);
				});
			});		

			$(".watched-episode").change(function() {
				var parentListItem = $(this).parents('li.single-season');
			    var episodeIndex = $(this).attr('data-episode');
			    var seasonIndex = $(this).attr('data-season');
			    seriesCollection.updateWatchedStatus(that.model.id, parseInt(seasonIndex, 10), parseInt(episodeIndex, 10), this.checked);

			    var seasonCheckbox = $(this).parents('li.single-season').find('.watched-season');
			    if(this.checked){
			    	that.drawPath(this);
			    	var checkboxes = parentListItem.find('ul.list-episodes .watched-episode');
			    	var allChecked = true;

			    	_.each(checkboxes, function(checkbox, index, list){
			    		if($(checkbox)[0].checked === false){
			    			allChecked = false;
			    		}
			    	});
			    	if(allChecked){
			    		seasonCheckbox[0].checked = true;
			    		that.drawPath(seasonCheckbox);
			    	}
			    }else{
			    	if(seasonCheckbox[0].checked){
			    		seasonCheckbox[0].checked = false;
			    		that.removePath(seasonCheckbox);
			    	}
			    	that.removePath(this);
			    }
			});

			$(".watched-episode").click(function(event) {
				event.stopPropagation();
			});
		

			$(".watched-season").change(function() {
				var other = this;
			    var seasonIndex = $(this).attr('data-season');
			    var parentListItem = $(this).parents('li.single-season');
			    var checkboxes = parentListItem.find('ul.list-episodes .watched-episode');

			    _.each(checkboxes, function(checkbox, index, list){
			    	var state = $(checkbox)[0].checked;
			    	if(other.checked){
			    		if(state === false){
				    		$(checkbox).trigger('click');
				    	}
				    }else{
				    	
				    	if(state === true){
				    		$(checkbox).trigger('click');
				    	}
				    }
			    });

			    if(this.checked){
			    	that.drawPath(this);
			    }else{
			    	that.removePath(this);
			    }
			});
			
			$("li.episode").click(function(event) {
				var checkbox = $(this).find('input');
				checkbox.trigger('click');
			});
			
		};

		DetailView.prototype.applyCheckboxStyle = function(){
			var that = this;
			
			$(".watched-episode").each(function(index) {
				$(this).after(that.createSVG());
			});

			$(".watched-season").each(function(index) {
				$(this).after(that.createSVG());
			});
		};

		DetailView.prototype.checkWatchedEpisodes = function(){
			var that = this;
			$(".watched-episode").each(function(index, el) {
				if(this.checked){
					that.drawPath(this);
				}
			});
			$(".watched-season").each(function(index, el) {
				if(this.checked){
					that.drawPath(this);
				}
			});
		};

		DetailView.prototype.expandCurrentSeasons = function(){
			var currentSeason = this.model.currentSeason;
			if(currentSeason > -1){
				var listItem = $("ul.list-seasons").children('li')[currentSeason -1];
				
				var click = _.bind(function(){
					$(this).find('.expand').trigger('click');
				}, listItem);
				_.delay(click, 80);
				
				// $(listItem).find('.expand').trigger('click');
			}
		};

		DetailView.prototype.drawPath = function(checkbox){
			var that = this;
			var svg = $(checkbox).next('svg'),
			    paths = [];
			paths.push(document.createElementNS('http://www.w3.org/2000/svg', 'path' ));
			for(var i = 0, len = paths.length; i < len; ++i) {
				var path = paths[i];
				svg.append(path);

				path.setAttributeNS( null, 'd', that.pathDef);

				var length = path.getTotalLength();

				path.style.strokeDasharray = length + ' ' + length;
				if( i === 0 ) {
					path.style.strokeDashoffset = Math.floor( length ) - 1;
				}
				else {
					path.style.strokeDashoffset = length;
				}

				path.getBoundingClientRect();

				path.style.transition = path.style.WebkitTransition = path.style.MozTransition  = 'stroke-dashoffset ' + that.animDef.speed + 's ' + that.animDef.easing + ' ' + i * that.animDef.speed + 's';

				path.style.strokeDashoffset = '0';
			}
		};

		DetailView.prototype.removePath = function(checkbox){
			var svg = $(checkbox).next('svg');
			svg.children('path').remove();
		};

		DetailView.prototype.createSVG = function(){
			var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			var def = false;
			if(def) {
				svg.setAttributeNS( null, 'viewBox', def.viewBox );
				svg.setAttributeNS( null, 'preserveAspectRatio', def.preserveAspectRatio );
			}
			else {
				svg.setAttributeNS( null, 'viewBox', '0 0 100 100' );
			}
			svg.setAttribute( 'xmlns', 'http://www.w3.org/2000/svg' );
			return svg;
		};


		var SearchModel = function(){
			this.results = [];
		};

		SearchModel.prototype.add = function(object){
			if(!_.isNull(object) && !_.isEmpty(object)){
				this.results.push(object);
			}
		};

		SearchModel.prototype.get = function(which){
			return this[which];
		};

		SearchModel.prototype.empty = function(){
			this.results = [];
		};

		var SearchView = function(options){
			this.element = $("#query-series");
			this.messages = {
				adddedSeries: "Added...",
				alreadyAdded: "Already added..."
			};
			this.ajaxCounter = 0;

			var that = this;
			this.element.on('input', function(event) {
				that.search();
			});
			this.element.on('keydown', function(event) {
				if (event.keyCode === 8){
    				that.element.trigger('input');
    			}
			});
			mainView.getElement().on('click', '.add', function(event) {
				event.preventDefault();
				mainView.activateOverlay();
				$(this).attr('disabled', 'true');
				$(this).html(that.messages.adddedSeries);
				var seriesId = $(this).parents('li').attr('id');
				var series = _.find(that.model.get("results"), function(element){
					return element.id == seriesId;
				});
				if(_.isUndefined(series)){
					return;
				}

				var isSaved = _.find(seriesCollection.series, function(element){
					return element.id == seriesId;
				});

				if(!_.isUndefined(isSaved)){
					$(this).attr('disabled', 'true');
					$(this).html(that.messages.alreadyAdded);
					mainView.deactivateOverlay();
					return;
				}

				that.fetchShow(series);
			});

			this.template = _.template($("#template-search-results").html());
			this.controller = options.controller || null;
			this.model = options.model || null;
			this.collection = options.collection || null;
		};
		var searchView = new SearchView({model: new SearchModel()});

		SearchView.prototype.get = function(which){
			return this[which];
		};

		SearchView.prototype.render = function(){
			mainView.toggleNavigation(true);
			mainView.render(this.template({results: this.model.get("results")}));
		};

		SearchView.prototype.search = function(){
			var searchItem = $.trim(this.element.val()),
				query = "http://api.themoviedb.org/3/search/tv?api_key=" + _key + "&query=" + searchItem + "&search_type=ngram";
			if(!_.isNull(_currentRequest)){
				_currentRequest.abort();
			}

			this.model.empty();

			_isSearching = true;

			if(searchItem.length > 0){
				var that = this;
				_currentRequest = $.get(query, function(data) {
					if(!_.isNull(data) && !_.isEmpty(data)){
						_.each(data.results, function(element, index, list){
							that.model.add({
								id: element.id,
								name: element.name,
								image: element.poster_path,
								date: element.first_air_date
							});
						});
					}
				}, 'json')
				.done(function() {
					// nothing to do here...
				})
				.fail(function() {
					// nothing to do here...
				})
				.always(function() {
					that.render();
				});
			}else{
				// seriesListView.render();
			}

		};

		SearchView.prototype.fetchShow = function(data){
			this.ajaxCounter = 0;
			var series = new SeriesModel({
				id: data.id,
				name: data.name,
				image: data.image,
				date: data.date
			});

			var url = "http://api.themoviedb.org/3/tv/" + series.id + "?api_key=" + _key;
			var that = this;
			$.get(url, function(response) {
				series.inProduction = response.in_production;
				series.numberOfEpisodes = response.number_of_episodes;
				series.seasons = [];

				var seasons = response.seasons;

				if(seasons[0].season_number === 0){
					seasons.splice(0, 1); // season 0 does not exist in reality
				}

				for(var k = 0; k < seasons.length; k++){
					var season = new SeasonModel({
						id: seasons[k].id,
						number: seasons[k].season_number,
						episodeCount: seasons[k].episode_count,
						seriesId: series.id,
						episodes: []
					});
					series.seasons.push(season);
				}
				for(var j = 1; j <= seasons.length; j++){
					for(var i = 1; i <= seasons[j - 1].episode_count; i++){
						that.fetchEpisode(series, j, i);
					}
				}
			}, 'json')
			.fail(function() {
				mainView.deactivateOverlay();
			})
			.done(function(){
				// nothing to do here...
			});
		};

		SearchView.prototype.fetchEpisode = function(series, seasonNumber, episodeNumber){
			var that = this;
			var url = "http://api.themoviedb.org/3/tv/" + series.id + "/season/" + seasonNumber + "/episode/" + episodeNumber + "?api_key=" + _key;
			$.get(url, function(response){
				var episode = new EpisodeModel({
					id: response.id,
					name: response.name,
					date: response.air_date,
					seriesId: series.id,
					seasonId: series.seasons[seasonNumber - 1].id,
					number: response.episode_number
				});
				series.seasons[seasonNumber - 1].episodes.push(episode);

			}, 'json').
			done(function(){
				that.ajaxCounter += 1;
				if(that.ajaxCounter >= series.numberOfEpisodes){
					seriesCollection.save(series);
				}
			});
		};
	};
	return {
		init: init
	};
})();

Watchnext.init();
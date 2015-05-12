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
		/* Localstorage adapter */
		var LocalStorageAdapter = function(show){
			
		};
		var adapter = new LocalStorageAdapter();

		LocalStorageAdapter.prototype.save = function(show){
			var key = show.id;
			var data = {};
			data[key] = show;
			chrome.storage.local.set(data, function() {
				console.log("Saved!", show);
				searchView.deactivateOverlay();
			});
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
			this.remind = attrs.remind || false;
			this.inProduction = attrs.inProduction || false;
			this.seasons = [];
		}


		function SeriesCollection(){
			this.series = [];
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
			_.each(data, function(element, index, list){
				that.add(element);
			});
			seriesListView.render();
		};

		SeriesCollection.prototype.update = function(show){
			adapter.save(show);
		};

		SeriesCollection.prototype.updateWatchedStatus = function(seriesId, seasonIndex, episodeIndex, yep){
			var that = this;
			
			var show = _.find(this.series, function(element){
				return seriesId == element.id;
			});

			if(_.isNull(episodeIndex)){

			}else{

			}
			show.seasons[seasonIndex].episodes[episodeIndex].watched = yep;
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

					var detailView = new DetailView({
						model: series
					});
					detailView.render();
				}else{
					seriesListView.render();
				}
				
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
				var series = that.collection.get("series")[index];
				that.showDetails(series);
			});
		};
		var seriesListView = new SeriesListView({'collection': seriesCollection});

		SeriesListView.prototype.render = function(){
			mainView.toggleNavigation(false);
			mainView.render(this.template({seriesList: this.collection.get("series")}));

			_state = -1;
			_isSearching = false;
		};

		SeriesListView.prototype.delete = function(item){
			var seriesId = item.attr('id');
			var index = _.findIndex(this.collection.get("series"), function(element){
				return seriesId == element.id;
			});
			item.remove();
			this.collection.remove(seriesId);
			adapter.remove(seriesId);
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

			_state = this.model.id;
			_isSearching = false;
		};

		DetailView.prototype.applyEvents = function(){
			var that = this;
			$(".expand").on('click', function(event) {
				var listItem = $(this).parents('.single-season');
				listItem.toggleClass('expand');
				listItem.siblings().removeClass('expand');
			});		

			$(".watched-episode").change(function() {
			    var episodeIndex = $(this).attr('data-episode');
			    var seasonIndex = $(this).attr('data-season');
			    seriesCollection.updateWatchedStatus(that.model.id, parseInt(seasonIndex, 10), parseInt(episodeIndex, 10), this.checked);

			    var svg = $(this).next('svg'),
			    	paths = [];
			    paths.push(document.createElementNS('http://www.w3.org/2000/svg', 'path' ));
			    if(this.checked){
			    	for(var i = 0, len = paths.length; i < len; ++i) {
						var path = paths[i];
						svg.append(path);

						path.setAttributeNS( null, 'd', that.pathDef);

						var length = path.getTotalLength();
						// Clear any previous transition
						//path.style.transition = path.style.WebkitTransition = path.style.MozTransition = 'none';
						// Set up the starting positions
						path.style.strokeDasharray = length + ' ' + length;
						if( i === 0 ) {
							path.style.strokeDashoffset = Math.floor( length ) - 1;
						}
						else path.style.strokeDashoffset = length;
						// Trigger a layout so styles are calculated & the browser
						// picks up the starting position before animating
						path.getBoundingClientRect();
						// Define our transition
						path.style.transition = path.style.WebkitTransition = path.style.MozTransition  = 'stroke-dashoffset ' + that.animDef.speed + 's ' + that.animDef.easing + ' ' + i * that.animDef.speed + 's';
						// Go!
						path.style.strokeDashoffset = '0';
					}
			    }else{
			    	svg.children('path').remove();
			    }
			});

			/*
			$(".watched-season").change(function() {
			    var seasonIndex = $(this).attr('data-season');
			    seriesCollection.updateWatchedStatus(that.model.id, parseInt(seasonIndex, 10), null, this.checked);
			});
			*/
		};

		DetailView.prototype.applyCheckboxStyle = function(){
			var that = this;
			
			$(".watched-episode").each(function(index) {
				$(this).after(that.createSVG());
			});
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
				adddedSeries: "Added..."
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
				that.activateOverlay();
				$(this).attr('disabled', 'true');
				$(this).html(that.messages.adddedSeries);
				var seriesId = $(this).parents('li').attr('id');
				var series = _.find(that.model.get("results"), function(element){
					return element.id == seriesId;
				});
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

		SearchView.prototype.activateOverlay = function(){
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

		SearchView.prototype.deactivateOverlay = function(){
			mui.overlay('off');
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
			}, 'json').
			done(function(){
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
var Watchnext = (function(){
	var _key = 'eb2f22e12032ae1141522496ebbcce55',
	_currentRequest = null,
	_elements = {
		body: $("body"),
		mainSection: $("section.main-section"),
		seriesList: $(".list-series")
	},
	init = function(){
		/* Search */
		Watchnext.SearchModel = Backbone.Model.extend({

		});

		Watchnext.ResultsCollection = Backbone.Collection.extend({
			model: Watchnext.SearchModel	
		});
		var resultsCollection = new Watchnext.ResultsCollection();

		/* Saved Series */
		Watchnext.EpisodeModel = Backbone.Model.extend({
			defaults: function() {
				return {
					watched: false
				};
			},
			id: function(){
				return null;
			},
			seriesId: function(){
				return null;
			},
			seasonId: function(){
				return null;
			},
			name: function(){
				return null;
			},
			date: function(){
				return null;
			},
			number: function(){
				return null;
			},
			toggle: function() {
		    	this.save({watched: !this.get("watched")});
		    }
		});

		Watchnext.EpisodeCollection = Backbone.Collection.extend({
			model: Watchnext.EpisodeModel,
			localStorage: new Backbone.LocalStorage("watch-series-episodes"),
			comparator: 'number'
		});

		Watchnext.SeasonModel = Backbone.Model.extend({
			id: function(){
				return null;
			},
			seriesId: function(){
				return null;
			},
			number: function(){
				return null;
			},
			episodeCount: function(){
				return null;
			},
			initialize: function(attrs, options){
		    	var episodes = attrs ? attrs.episodes : [];
			    if(!(episodes instanceof Watchnext.EpisodeCollection)) {
			        this.set('episodes', new Watchnext.EpisodeCollection(episodes), {silent:true});
			    }	    	
		    },
		    parse: function(attrs){
		    	console.log("Parse: ", attrs);
		    	//var episodes = _.where(attrs.episodes);
		    	if (_.has(attrs, 'episodes')) {
			        if (this.episodes) { 
			            this.episodes.reset(attrs.episodes); 
			        } else {
			            this.episodes = new Watchnext.EpisodeCollection(attrs.episodes); 
			        }
			        delete attrs.episodes;
			    }
		    	//attrs.episodes = new Watchnext.EpisodeCollection(attrs.episodes);
    			return attrs;
		    },
		    toJSON: function(){
		    	var json = Backbone.Model.prototype.toJSON.call(this);
			    if(json.episodes instanceof Watchnext.EpisodeCollection) {
			    	json.episodes = json.episodes.toJSON();
			    }
			    return json;
		    }
		});

		Watchnext.SeasonCollection = Backbone.Collection.extend({
			model: Watchnext.SeasonModel,
			localStorage: new Backbone.LocalStorage("watch-series-seasons"),
			comparator: false
		});

		Watchnext.SeriesModel = Backbone.Model.extend({
			defaults: function() {
				return {
					remind: false,
					inProduction: false
				};
			},
			id: function(){
				return null;
			},
			name: function(){
				return null;
			},
			image: function(){
				return null;
			},
			date: function(){
				return null;
			},
		    numberOfEpisodes: function(){
		    	return null;
		    },
		    initialize: function(attrs, options){
		    	var seasons = attrs ? attrs.seasons : [];
			    if(!(seasons instanceof Watchnext.SeasonCollection)) {
			        this.set('seasons', new Watchnext.SeasonCollection(seasons), {silent:true});
			    }	    	
		    },
		    parse: function(attrs){
		    	if (_.has(attrs, 'seasons')) {
			        if (this.seasons) { 
			            this.seasons.reset(attrs.seasons); 
			        } else {
			            this.seasons = new Watchnext.SeasonCollection(attrs.seasons); 
			        }
			        delete attrs.seasons;
			    }
		    	//attrs.seasons = new Watchnext.SeasonCollection(attrs.seasons);
    			return attrs;
		    },
		    toJSON: function(){
		    	var json = Backbone.Model.prototype.toJSON.call(this);
			    if(json.seasons instanceof Watchnext.SeasonCollection) {
			    	json.seasons = json.seasons.toJSON();
			    }
			    return json;
		    }
		});

		Watchnext.SeriesCollection = Backbone.Collection.extend({
			model: Watchnext.SeriesModel,
			localStorage: new Backbone.LocalStorage("watch-series"),
			comparator: 'title'	
		});
		var seriesCollection = new Watchnext.SeriesCollection();
		seriesCollection.on("add", function(series){
			
		});

		/* Views */
		Watchnext.EpisodeView = Backbone.View.extend({
			tagName: 'li',
			className: 'single-episode',
			template: _.template($("#template-episode").html()),
			events: {
				
			},
			initialize: function(){
				
			},
			render: function(){
				var data = this.model.toJSON();
				this.$el.attr('id', data.id);
				this.$el.html(this.template(data));
				return this;
			},
			expand: function(){
				
			}
		});

		Watchnext.SeasonView = Backbone.View.extend({
			tagName: 'li',
			className: 'single-season mui-panel',
			template: _.template($("#template-season").html()),
			events: {
				"click .expand" : "expand"
			},
			initialize: function(){
				
			},
			render: function(){
				var that = this;
				var data = this.model.toJSON();
				this.$el.attr('id', data.id);
				this.$el.html(this.template(data));
				this.expandButton = this.$('.expand');
				this.model.get("episodes").each(function(episode){
					//var view = new Watchnext.EpisodeView({model: episode});
      				//that.$el.append(view.render().el);
				});
				return this;
			},
			expand: function(){
				
			}
		});

		Watchnext.SeriesDetailsView = Backbone.View.extend({
			el: _elements.mainSection,
			events: {
				
			},
			headerTemplate: _.template("<h5><%- name %></h5>"),
			listTemplate: _.template("<ul class='list-seasons'></ul>"),
			initialize: function(){
				var that = this;				
				this.collection.fetch({
					success: function(){
						var counter = 0;
						for(var i = 0; i < that.collection.length; i++){
							that.collection.at(i).get("episodes").fetch({
								success: function(){
									counter = counter + 1;
									if(counter >= that.collection.length){
										//that.render();
										//console.log(that.model);
									}
								}
							});
						}
					}
				});
				
			},
			render: function(){
				this.$el.empty();
				var that = this,
					data = this.model.toJSON(),
					header = $(this.headerTemplate({name: data.name})),
					list = $(this.listTemplate());
				this.model.get("seasons").each(function(season){
					var view = new Watchnext.SeasonView({model: season});
      				list.append(view.render().el);
				});
				this.$el.append(list);
				return this;
			}
		});

		Watchnext.SingleSeriesView = Backbone.View.extend({
			tagName: 'li',
			className: 'single-series mui-panel',
			events: {
				"click .details" : "loadDetails",
				"click .delete": "delete"
			},
			template: _.template($("#template-series").html()),
			initialize: function(){
				this.listenTo(this.model, 'destroy', this.remove);
			},
			render: function(){
				var data = this.model.toJSON();
				this.$el.attr('id', data.id);
				this.$el.html(this.template(data));
				return this;
			},
			loadDetails: function(){
				var detailsView = new Watchnext.SeriesDetailsView({
					model: this.model,
					collection: this.model.get("seasons")
				});
			},
			showDetails: function(){
				
			},
			delete: function(){
				this.model.destroy();
			}
		});

		Watchnext.SeriesView = Backbone.View.extend({
			el: _elements.mainSection,
			events: {
				
			},
			listTemplate: _.template("<ul class='list-series'></ul>"),
			initialize: function(){
				var that = this;
				this.collection.fetch({
					success: function(){
						that.render();
					}
				});
			},
			render: function(){
				this.$el.empty();
				var that = this,
					list = $(this.listTemplate());
				this.collection.each(function(series){
					var view = new Watchnext.SingleSeriesView({model: series});
      				list.append(view.render().el);
				});
				this.$el.append(list);
				return this;
			}
		});
		var seriesView = new Watchnext.SeriesView({
			collection: seriesCollection,
		});


		Watchnext.SingleResultView = Backbone.View.extend({
			tagName: 'li',
			className: 'single-series mui-panel',
			template: _.template($("#template-search-result").html()),
			events: {
				"click .add" : "add"
			},
			initialize: function(){
				this.counter = 0;
			},
			render: function(){
				var data = this.model.toJSON();
				this.$el.attr('id', data.id);
				this.$el.html(this.template(data));
				this.addButton = this.$('.add');
				return this;
			},
			add: function(){
				this.updateUI();
				this.fetchShow();
			},
			updateUI: function(){
				this.addButton.attr('disabled', 'true');
				this.addButton.html('Added...');
			},
			fetchShow: function(){
				var searchResult = this.model.toJSON();
				var show = new Watchnext.SeriesModel({
					id: searchResult.id,
					name: searchResult.name,
					image: searchResult.image,
					date: searchResult.date
				});

				var url = "http://api.themoviedb.org/3/tv/" + searchResult.id + "?api_key=" + _key;
				var that = this;
				$.get(url, function(showResponse) {
					show.set("inProduction", showResponse.in_production);
					show.set("numberOfEpisodes", showResponse.number_of_episodes);
					show.set("seasons", new Watchnext.SeasonCollection());
					seriesCollection.create(show);

					var seasons = showResponse.seasons;
					for(var j = 0; j < seasons.length; j++){
						var season = show.get("seasons").push({
							id: seasons[j].id,
							number: seasons[j].season_number,
							episodeCount: seasons[j].episode_count,
							seriesId: show.get("id"),
							episodes: new Watchnext.EpisodeCollection()
						});
						season.save();
					}
					for(var j = 0; j < seasons.length; j++){
						for(var i = 1; i <= seasons[j].episode_count; i++){
							that.fetchEpisode(show.get("seasons").at(j), i);
						}
					}
				}, 'json').
				done(function(){

				});
			},
			fetchEpisode: function(season, episode){
				var that = this;
				var showId = season.get("seriesId");
				var url = "http://api.themoviedb.org/3/tv/" + showId + "/season/" + season.get("number") + "/episode/" + episode + "?api_key=" + _key;
				$.get(url, function(response){
					var episode = {
						id: response.id,
						name: response.name,
						date: new Date(response.air_date),
						seriesId: showId,
						seasonId: season.get("id"),
						number: response.episode_number
					};
					var episodes = season.get("episodes");
					episodes.create(episode);
					season.save({
						episodes: episodes 
					}, {patch: true});

					that.saveShow(showId);
				}, 'json');
			},
			saveShow: function(id){
				this.counter = this.counter + 1;
				var show = seriesCollection.get(id); 
				if(this.counter >= show.get("numberOfEpisodes")){
					show.save({
						seasons: show.get("seasons")
					}, {patch: true});
				}
			}
		});

		Watchnext.ResultsView = Backbone.View.extend({
			el: _elements.mainSection,
			events: {
				
			},
			listTemplate: _.template("<ul class='list-series'></ul>"),
			initialize: function() {
				this.listenTo(this.collection, "add", this.render);
				this.listenTo(this.collection, "reset", this.render);
			},
			render: function(){
				this.$el.empty();
				var that = this,
					list = $(this.listTemplate());
				this.collection.each(function(series){
					var view = new Watchnext.SingleResultView({model: series});
    				list.append(view.render().el);
				});
				this.$el.append(list);
				return this;
			}
		});
		var resultsView = new Watchnext.ResultsView({
			collection: resultsCollection,
		});

		Watchnext.MainView = Backbone.View.extend({
			el: _elements.body,
			events: {
				"input #query-series": "search",
				"keydown #query-series": "keydown",
				"click #back-to-main": "backToMain"
			},
			initialize: function(){
				this.queryInput = $("#query-series");
				this.backToMain = $("#back-to-main");
			},
    		render: function() {
    			var view = this;
		        var compiledTemplate = this.template({pets: view.collection});
		        view.$el.html(compiledTemplate);
			    return this;
			},
			keydown: function(e){
				if (e.keyCode === 8){
    				this.queryInput.trigger('input');
    			}
			},
			search: function () {
				this.backToMain.removeClass('mui-hide');
				var searchItem = this.queryInput.val();
				searchItem = $.trim(searchItem);
				var query = "http://api.themoviedb.org/3/search/tv?api_key=" + _key + "&query=" + searchItem;
				if(!_.isNull(_currentRequest)){
					_currentRequest.abort();
				}
				if(searchItem.length > 0){
					_currentRequest = $.get(query, function(data) {
						if(_.isNull(data) || _.isEmpty(data)){
							resultsCollection.reset();
						}else{
							resultsCollection.reset();
							_.each(data.results, function(element, index, list){
								resultsCollection.add(new Watchnext.SearchModel({
									id: element.id,
									name: element.name,
									image: element.poster_path,
									date: new Date(element.first_air_date)
								}));
							});
						}
					}, 'json')
					.done(function() {
						// nothing to do here...
					})
					.fail(function() {
						resultsCollection.reset();
					})
					.always(function() {
						// nothing to do here...
					});
				}else{
					resultsCollection.reset();
					this.backToMain.trigger('click');
				}
					
			},
			backToMain: function(){
				this.backToMain.addClass('mui-hide');
				resultsCollection.reset();
				this.queryInput.val("");
				this.queryInput.attr('placeholder', 'Find new series...');

				seriesView.render();
			}
		});
		var mainView = new Watchnext.MainView();


		Watchnext.Router = Backbone.Router.extend({
			routes: {
				'search': 'search',
				'details': 'details',
				'': 'home'
			},

			search: function () {
				var view = new app.Views.Activity();
				app.instance.goto(view);
			},
			details: function(){

			},
			home: function () {
				seriesView.render();
			}
		});
	};
	return {
		init: init
	};
})();

Watchnext.init();
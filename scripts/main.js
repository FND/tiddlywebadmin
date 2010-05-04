(function($) {

var ns = tiddlyweb.admin = {
	root: document.body,

	refreshCollection: function(type) {
		var collection = new tiddlyweb.Collection(type, this.getHost());
		collection.get(function(data, status, xhr) {
			ns.renderCollection(type, data).replaceAll("#" + type);
		}, this.notify);
	},
	renderCollection: function(type, items, container) { // XXX: adapted from TiddlyRecon's listCollection (along with HTML template)
		// TODO: sorting (cf. TiddlyRecon)
		return $("#template_collection").template({
			id: type,
			title: tiddlyweb._capitalize(type), // TODO: optional title argument
			items: items
		});
	},
	createContainer: function(ev) {
		// TODO: should not create entity, but only present properties dialog
		//       at which point this specialized form is obsolete
		var btn = $(this);
		var type = btn.attr("name");
		var form = btn.closest("form");
		var name = form.find("input[name=name]").val();
		var desc = form.find("input[name=description]").val();
		var cls = tiddlyweb._capitalize(type);
		var entity = new tiddlyweb[cls](name, ns.getHost());
		entity.put(function(data, status, xhr) {
			ns.refreshCollection(type + "s");
		}, ns.notify);
		return false;
	},
	getHost: function() {
		return $("#settings").find("input[name=host]").val();
	},
	notify: function(msg) { // TODO: proper implementation -- XXX: does not belong into this namespace!?
		if(window.console && console.log) {
			console.log.apply(this, arguments);
		} else {
			if(arguments.length > 1) {
				msg = arguments[1] + ": " + arguments[0].statusText; // XXX: assumes jQuery.ajax error callback
			}
			alert(msg);
		}
	}
};

if(window.location.protocol == "file:") {
	$._ajax = $.ajax;
	$.ajax = function() { // XXX: this should be simpler
		var self = this;
		var args = arguments;
		sudo(function() {
			$._ajax.apply(self, args);
		});
	};
}

var refreshAll = function(ev) {
	ns.refreshCollection("recipes");
	ns.refreshCollection("bags");
	return false;
};

$("#settings").
	find("input[name=host]").val("http://0.0.0.0:8080").end(). // XXX: DEBUG
	find("input[type=submit]").val("Refresh").click(refreshAll); // TODO: i18n

$("#creator").find("input[type=submit]").click(ns.createContainer);

refreshAll();

})(jQuery);

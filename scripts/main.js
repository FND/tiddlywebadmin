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
		var ctx = {
			id: type,
			title: tiddlyweb._capitalize(type), // TODO: optional title argument
			btnLabel: "New", // TODO: i18n
			items: items
		};
		return $("#template_collection").template(ctx).data({ type: type }).
			find(".button:first").click(this.containerDialog).end();
	},
	containerDialog: function(ev) { // TODO: when spawned from New button, warn if entity already exists
		var type = $(this).closest("section").data("type");
		type = type.substr(0, type.length - 1);
		$("#template_containerForm").template({ btnLabel: "Save" }). // TODO: i18n
			data({ type: type }).
			find("[type=submit]").click(ns.updateContainer).end().
			dialog({
				title: "Add " + tiddlyweb._capitalize(type), // TODO: i18n
				closeOnEscape: false,
				close: function(ev, ui) {
					$(this).closest(".ui-dialog").remove();
				}
			});
		return false;
	},
	updateContainer: function(ev) {
		var form = $(this).closest("form");
		var name = form.find("[name=name]").val();
		var desc = form.find("[name=description]").val();
		var type = form.data("type");
		var cls = tiddlyweb._capitalize(type);
		var entity = new tiddlyweb[cls](name, ns.getHost());
		entity.desc = desc;
		entity.put(function(data, status, xhr) {
			ns.refreshCollection(type + "s");
		}, ns.notify);
		return false;
	},
	getHost: function() {
		return $("#settings").find("[name=host]").val();
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
	var ajax = $.ajax;
	$.ajax = function() { // XXX: this should be simpler
		var self = this;
		var args = arguments;
		sudo(function() {
			ajax.apply(self, args);
		});
	};
}

var refreshAll = function(ev) {
	ns.refreshCollection("recipes");
	ns.refreshCollection("bags");
	return false;
};

$("#settings").
	find("[name=host]").val("http://0.0.0.0:8080").end(). // XXX: DEBUG
	find("[type=submit]").val("Refresh").click(refreshAll); // TODO: i18n

refreshAll();

})(jQuery);

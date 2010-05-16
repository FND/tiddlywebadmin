(function($) {

var ns = tiddlyweb.admin = {
	root: document.body,

	refreshCollection: function(type) {
		var collection = new tiddlyweb.Collection(type, this.getHost());
		collection.get(function(resource, status, xhr) {
			ns.renderCollection(type, resource).replaceAll("#" + type);
		}, this.notify);
	},
	renderCollection: function(type, items, container) { // XXX: adapted from TiddlyRecon's listCollection (along with HTML template)
		var ctx = {
			id: type,
			title: tiddlyweb._capitalize(type), // TODO: optional title argument
			btnLabel: "New", // TODO: i18n
			items: items.sort(function(a, b) {
				var x = a.toLowerCase();
				var y = b.toLowerCase();
				return ((x < y) ? -1 : ((x > y) ? 1 : 0));
			})
		};
		return $("#template_collection").template(ctx).data({ type: type }).
			find(".button, li a").click(this.containerDialog).end();
	},
	containerDialog: function(ev) { // TODO: when spawned from New button, warn if entity already exists
		var btn = $(this);
		var type = btn.closest("section").data("type");
		type = type.substr(0, type.length - 1);
		var form = $("#template_containerForm").template({ btnLabel: "Save" }). // TODO: i18n
			data({ type: type }).submit(ns.updateContainer);
		if(type != "recipe") { // XXX: special-casing
			form.find("[name=recipe]").closest("dd").prev().remove().end().remove();
		}
		form.dialog({
			title: "Add " + tiddlyweb._capitalize(type), // TODO: i18n
			closeOnEscape: false,
			close: function(ev, ui) {
				$(this).closest(".ui-dialog").empty().remove(); // emptying required due to jQuery UI magic
			}
		});
		if(btn.parent()[0].tagName.toLowerCase() == "li") { // XXX: hacky? -- XXX: special-casing
			var name = $.trim(btn.text());
			var cls = tiddlyweb._capitalize(type);
			form.dialog("option", "title", cls + ": " + name);
			form.find("[name=name]").val(name).addClass("readOnly");
			var fields = form.find("input, textarea").attr("disabled", true);
			var entity = new tiddlyweb[cls](name, ns.getHost());
			entity.get(function(resource, status, xhr) {
				form.data("resource", resource); // XXX: temporary workaround (see below)
				fields.filter("[name=description]").val(resource.desc);
				if(type == "recipe") { // XXX: special-casing
					var recipe = ns.serializeRecipe(resource.recipe);
					fields.filter("[name=recipe]").val(recipe);
				}
				fields.not(".readOnly").attr("disabled", false);
			}, ns.notify);
		}
		return false;
	},
	updateContainer: function(ev) { // TODO: rename (also does original PUTs...)
		var form = $(this).closest("form");
		var name = form.find("[name=name]").val();
		var desc = form.find("[name=description]").val();
		var type = form.data("type");
		var cls = tiddlyweb._capitalize(type);
		var entity = new tiddlyweb[cls](name, ns.getHost());
		entity.desc = desc;
		if(type == "recipe") { // XXX: special-casing
			var recipe = form.find("[name=recipe]").val();
			entity.recipe = ns.deserializeRecipe(recipe);
			if(entity.recipe === false) {
				return false;
			}
		}
		var resource = form.data("resource");
		if(resource) { // XXX: special-casing
			entity = restore(entity, resource); // XXX: temporary workaround (otherwise policy will be reset)
		}
		entity.put(function(resource, status, xhr) {
			ns.refreshCollection(type + "s"); // XXX: redundant if entity not new
		}, ns.notify);
		return false;
	},
	serializeRecipe: function(recipe) {
		var lines = recipe.map(function(item, i) {
			return item[0] + "?" + item[1];
		});
		return lines.join("\n");
	},
	deserializeRecipe: function(str) { // TODO: ensure validity
		return str.split("\n").map(function(item, i) {
			return item.split("?"); // TODO: encode special characters?
		});
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

var restore = function(entity, resource) { // XXX: temporary workaround (see above)
	for(var i = 0; i < resource.data.length; i++) {
		var attr = resource.data[i];
		var val = entity[attr];
		if(val && val.length !== undefined ? val.length === 0 : !val) { // XXX: hacky and imprecise
			entity[attr] = resource[attr];
		}
	}
	return entity;
};

if(window.location.protocol == "file:") {
	var ajax = $.ajax;
	$.ajax = function() { // XXX: this should be simpler -- XXX: does not return XHR object
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

$("#settings").submit(refreshAll). // TODO: i18n
	find("[name=host]").val("http://0.0.0.0:8080"); // XXX: DEBUG

refreshAll();

})(jQuery);

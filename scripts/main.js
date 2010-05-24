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
			data({ type: type }).submit(ns.updateContainer).
			find("[name=policy]").focus(ns.policyDialog).end(); // XXX: focus event limits interaction (due to read-only)
		if(type != "recipe") { // XXX: special-casing
			form.find("[name=recipe]").closest("dd").prev().remove().end().remove();
		}
		form.dialog({
			title: "Add " + tiddlyweb._capitalize(type) // TODO: i18n
		});
		if(btn.parent()[0].tagName.toLowerCase() == "li") { // XXX: hacky? -- XXX: special-casing
			var name = $.trim(btn.text());
			var cls = tiddlyweb._capitalize(type);
			form.dialog("option", "title", cls + ": " + name);
			form.find("[name=name]").val(name).addClass("readOnly");
			var fields = form.find("input, textarea").attr("disabled", true);
			var entity = new tiddlyweb[cls](name, ns.getHost());
			entity.get(function(resource, status, xhr) {
				fields.filter("[name=policy]").val($.toJSON(resource.policy));
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
	policyDialog: function(ev) {
		var src = $(this).attr("disabled", true);
		var form = src.closest("form");
		var policy = src.val();
		var type = form.data("type");
		var name = form.find("[name=name]").val();
		policy = new ns.Policy($.parseJSON(policy));
		var pos = src.offset(); // XXX: mouse position would be better
		policy.editor().dialog({
			title: "Policy for " + tiddlyweb._capitalize(type) + " " + name, // TODO: i18n
			position: [pos.left, pos.top],
			close: function(ev, ui) {
				src.val($.toJSON(policy.policy)).attr("disabled", false);
				$.ui.dialog.prototype.options.close.apply(this, arguments);
			}
		});
	},
	updateContainer: function(ev) { // TODO: rename (also does original PUTs...)
		var form = $(this).closest("form");
		var name = form.find("[name=name]").val();
		var policy = form.find("[name=policy]").val();
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
		entity.policy = $.parseJSON(policy);
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

ns.Policy = function(policy) { // TODO: move to separate module
	this.policy = policy; // TODO: rename?
};
$.extend(ns.Policy.prototype, {
	constraints: { // TODO: descriptions; distinction bag/recipe
		read: "lorem",
		write: "ipsum",
		create: "dolor",
		"delete": "sit",
		manage: "amet",
		accept: "consectetur"
	},
	btnLabel: "Save",
	addLabel: "New",
	addPrompt: "Enter identifier:",
	delPrompt: "Are you sure you want to remove this item?",

	editor: function() { // TODO: rename?
		var ctx = {
			constraints: this.constraints,
			policy: {},
			btnLabel: this.btnLabel,
			addLabel: this.addLabel
		};
		// augment list items
		$.each(this.policy, function(constraint, items) {
			if(constraint == "owner") {
				ctx.policy[constraint] = items;
			} else if(items.length == 0) {
				ctx.policy[constraint] = ["<em>empty</em>"]; // TODO: i18n
			} else {
				ctx.policy[constraint] = $.map(items, function(item, i) {
					if(["ANY", "NONE"].indexOf(item) != -1) {
						return "<em>" + item + "</em>";
					} else if(item.substr(0, 2) == "R:") {
						return "<strong>" + item + "</strong>";
					} else {
						return item;
					}
				});
			}
		});
		return $("#template_policyForm").template(ctx).
			data({ self: this }).submit(this.update).
			find(".button").click(this.addIdentifier).end().
			find("dd li").click(this.delIdentifier).end();
	},
	update: function(ev) { // TODO: rename?
		var form = $(this).closest("form");
		var self = form.data("self");
		form.find("dt").each(function(i, item) {
			// XXX: relying on node text is dangerous due to i18n, markup (incl. captialization, punctuation)
			var el = $(item);
			var constraint = el.text();
			if(constraint != "owner") {
				self.policy[constraint] = [];
				el.next().find("li").each(function(i, item) {
					var identifier = $(item).text();
					if(["empty", "ANY", "NONE"].indexOf(identifier) == -1) {
						self.policy[constraint].push(identifier);
					}
				});
			}
		});
		form.dialog("close");
		return false;
	},
	addIdentifier: function(ev) {
		var el = $(this);
		var self = el.closest("form").data("self");
		var identifier = prompt(self.addPrompt); // XXX: alert is pfui
		if(identifier) {
			$("<li />").text(identifier).appendTo(el.prev()); // XXX: lacks augmentation (cf. editor method)
		}
	},
	delIdentifier: function(ev) {
		var el = $(this);
		var self = el.closest("form").data("self");
		if(confirm(self.delPrompt)) { // TODO: message should contain identifier (to verify click)
			el.slideUp(function() {
				var list = el.parent();
				$(this).remove();
				if(list.children().length == 0) {
					$("<li><em>empty</em></li>").hide().appendTo(list).slideDown(); // XXX: hacky (duplicates editor method's functionality)
				}
			});
		}
	}
});

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

$.extend($.ui.dialog.prototype.options, {
	closeOnEscape: false,
	close: function(ev, ui) {
		$(this).closest(".ui-dialog").empty().remove(); // emptying required due to jQuery UI magic
	}
});

$("#settings").submit(refreshAll). // TODO: i18n
	find("[name=host]").val("http://0.0.0.0:8080"); // XXX: DEBUG

refreshAll();

})(jQuery);

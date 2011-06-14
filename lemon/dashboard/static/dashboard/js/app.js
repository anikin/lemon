
(function(){this.dashboard={views:{},controllers:{},models:{},collections:{}};$(function(){new dashboard.controllers.Widgets({id:"dashboard"});Backbone.history.start();});})();dashboard.models.Widget=Backbone.Model.extend({viewClass:function(){return dashboard.views[this.get("viewName")];}});dashboard.models.WidgetInstance=Backbone.Model.extend({defaults:{column:"left",position:1},widget:function(){return dashboard.collections.widgets.get(this.get("widget"));},view:function(){var viewClass=this.widget().viewClass();return new viewClass({model:this});}});dashboard.models.AdminLogEntry=Backbone.Model;dashboard.collections.Widgets=Backbone.Collection.extend({model:dashboard.models.Widget,url:function(){return __dashboard_widget_instances_url__;}});dashboard.collections.widgets=new dashboard.collections.Widgets;dashboard.collections.WidgetInstances=Backbone.Collection.extend({model:dashboard.models.WidgetInstance,url:function(){return __dashboard_widget_instances_url__;},initialize:function(){this.bind("add",this.fetch);}});dashboard.collections.widgetInstances=new dashboard.collections.WidgetInstances;dashboard.collections.AdminLogEntries=Backbone.Collection.extend({model:dashboard.models.AdminLogEntry,url:function(){return __admin_log_entries_url__;}});dashboard.collections.adminLogEntries=new dashboard.collections.AdminLogEntries;dashboard.views.Template=Backbone.View.extend({initialize:function(){_.bindAll(this,"render","template");},render:function(){$(this.el).html(this.template(this.templateContext()));return this;},template:function(context){return this.compileTemplate(this.templateId)(context);},compileTemplate:_.memoize(function(templateId){return Handlebars.compile($("#"+templateId).html());}),templateContext:function(){return{}}});dashboard.views.WidgetInstanceContainer=dashboard.views.Template.extend({tagName:"li",className:"dashboard-widget-instance-container",templateId:"dashboard-widget-instance-container-template",events:{"click .dashboard-widget-instance-tools-close":"destroyModel",},initialize:function(){_.bindAll(this,"render","destroyModel","remove");this.model.bind("remove",this.remove);},render:function(){dashboard.views.Template.prototype.render.call(this);$(this.el).data("widgetInstance",this.model);this.$(".dashboard-widget-instance-body").append(this.model.view().el);return this;},templateContext:function(){var data=this.model.toJSON();data["widget"]=this.model.widget().toJSON();return data},destroyModel:function(){this.model.destroy();}});dashboard.views.TextWidget=Backbone.View.extend({tagName:"div",className:"dashboard-text-widget-instance",initialize:function(){this.render();},render:function(){$(this.el).html(this.model.widget().get("text"));return this;}});dashboard.views.AdminLog=dashboard.views.Template.extend({tagName:"div",className:"dashboard-admin-log-instance",templateId:"dashboard-admin-log-template",initialize:function(){dashboard.views.Template.prototype.initialize.call(this);if(dashboard.collections.adminLogEntries.length!==0){this.render();}
dashboard.collections.adminLogEntries.bind("refresh",this.render);},render:function(){dashboard.views.Template.prototype.render.call(this);this.$("tr:last").addClass("last");return this;},templateContext:function(){return{entries:dashboard.collections.adminLogEntries.toJSON()};}});dashboard.views.Column=Backbone.View.extend({tagName:"ul",className:"dashboard-widget-instance-list",initialize:function(){_.bindAll(this,"render","addOne","addAll","isThisColumn");this.column=this.options.column;dashboard.collections.widgetInstances.bind("refresh",this.render);},render:function(){$(this.el).data("columnView",this).empty();this.addAll();$(this.el).sortable({handle:".dashboard-widget-instance-title",placeholder:"dashboard-widget-instance-placeholder",forcePlaceholderSize:true,update:this.updatePosition});this.trigger("render",this);return this;},addOne:function(widgetInstance){var view=new dashboard.views.WidgetInstanceContainer({model:widgetInstance});$(this.el).append(view.render().el);},addAll:function(){var widgetInstances;widgetInstances=dashboard.collections.widgetInstances;widgetInstances=widgetInstances.select(this.isThisColumn);widgetInstances=_.sortBy(widgetInstances,this.getWidgetInstancePosition);_.each(widgetInstances,this.addOne);},isThisColumn:function(widgetInstance){return widgetInstance.get("column")==this.column;},getWidgetInstancePosition:function(widgetInstance){return widgetInstance.get("position");},updatePosition:function(event,ui){if(!ui.item.parent().is(this))return;ui.item.data("widgetInstance").set({column:$(this).data("columnView").column,position:ui.item.prevAll().length}).save();}});dashboard.views.Widget=dashboard.views.Template.extend({tagName:"li",className:"dashboard-widget",templateId:"dashboard-widget-template",events:{"click .dashboard-widget-add-link":"add"},initialize:function(){dashboard.views.Template.prototype.initialize.call(this);_.bindAll(this,"add"),this.model.bind("change",this.render);},templateContext:function(){return this.model.toJSON();},add:function(){dashboard.collections.widgetInstances.create({widget:this.model.id});return false;}});dashboard.views.Index=dashboard.views.Template.extend({tagName:"div",className:"dashboard-index",templateId:"dashboard-index-template",initialize:function(){_.bindAll(this,"updateConnection");dashboard.views.Template.prototype.initialize.call(this);this.leftColumn=new dashboard.views.Column({column:"left"});this.leftColumn.bind("render",this.updateConnection);this.rightColumn=new dashboard.views.Column({column:"right"});this.rightColumn.bind("render",this.updateConnection);this.render();},render:function(){dashboard.views.Template.prototype.render.call(this);this.$(".dashboard-left-column").append(this.leftColumn.el);this.$(".dashboard-right-column").append(this.rightColumn.el);return this;},templateContext:function(){return{title:__dashboard_index_view_title__,button:__dashboard_add_view_title__};},updateConnection:function(){$(this.rightColumn.el).sortable("option","connectWith",$(this.leftColumn.el));$(this.leftColumn.el).sortable("option","connectWith",$(this.rightColumn.el));}});dashboard.views.Add=dashboard.views.Template.extend({tagName:"div",className:"dashboard-add",templateId:"dashboard-add-template",initialize:function(){var render;dashboard.views.Template.prototype.initialize.call(this);_.bindAll(this,"addOne","addAll");dashboard.collections.widgetInstances.bind("refresh",this.render);dashboard.collections.widgetInstances.bind("remove",this.render);},render:function(){dashboard.views.Template.prototype.render.call(this);this.addAll();return this;},templateContext:function(){return{title:__dashboard_add_view_title__,button:__dashboard_index_view_title__};},addOne:function(widget){var view=new dashboard.views.Widget({model:widget});this.$("#dashboard-widget-list").append(view.render().el);},addAll:function(){var usedWidgetIds,availableWidgets;usedWidgetIds=dashboard.collections.widgetInstances.pluck("widget");availableWidgets=dashboard.collections.widgets.select(function(widget){return _.indexOf(usedWidgetIds,widget.id)===-1;});_(availableWidgets).each(this.addOne);}});dashboard.controllers.Widgets=Backbone.Controller.extend({routes:{"":"index","add":"add",},initialize:function(options){this.el=$("#"+options.id);this.indexView=new dashboard.views.Index;this.addView=new dashboard.views.Add;$([this.indexView.el,this.addView.el]).hide().appendTo(this.el);},index:function(){this.switchTo(this.indexView);},add:function(){this.switchTo(this.addView);},switchTo:function(view){if(this.activeView){$(this.activeView.el).hide();}
$(view.el).show();this.activeView=view;}});
/*global jQuery, Handlebars, Router */
jQuery(function ($) {
	'use strict';

	Handlebars.registerHelper('eq', function (a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';

			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}

			return uuid;
		},
		pluralize: function (count, word) {
			// decides whether to display 'items' or just 'item'
			return count === 1 ? word : word + 's';
		},
		store: function (namespace, data) {
			// if 2 arguments given, set localStorage to (namespace, JSON.stringify(data))
			// else
			// var store = localStorage.getItem(namespace);
			// return (store && JSON.parse(store)) || [];
			if (arguments.length > 1) {
				return localStorage.setItem(namespace, JSON.stringify(data));
			} else {
				var store = localStorage.getItem(namespace);
				return (store && JSON.parse(store) || []);
			}
		}	
	};

	var App = {
		init: function () {
			// initializes this.todos
			// configures the Handlebars templates
			// binds events
			// configures the Router
			this.todos = util.store('todos-jquery');
			this.todoTemplate = Handlebars.compile($('#todo-template').html());
			this.footerTemplate = Handlebars.compile($('#footer-template').html());
			this.bindEvents();

			new Router({
				'/:filter': function (filter) {
					this.filter = filter;
					this.render();
				}.bind(this)
			}).init('/all');
		},
		bindEvents: function () {
			// runs create on keyup in #new-todo
			// runs toggleAll on change of #toggle-all
			// runs destroyCompleted on click of #footer #clear-completed
			// on #todo-list:
			// runs toggle on change of .toggle
			// runs edit on dblclick of label
			// runs editKeyup on keyup of .edit
			// runs update on focusout of .edit
			// runs destroy on click of .destroy
			$('#new-todo').on('keyup', this.create.bind(this));
			$('#toggle-all').on('change', this.toggleAll.bind(this));
			$('#footer').on('click', '#clear-completed', this.destroyCompleted.bind(this));
			$('#todo-list')
				.on('change', '.toggle', this.toggle.bind(this))
				.on('dblclick', 'label', this.edit.bind(this))
				.on('keyup', '.edit', this.editKeyup.bind(this))
				.on('focusout', '.edit', this.update.bind(this))
				.on('click', '.destroy', this.destroy.bind(this));

		},
		render: function () {
			// gets filtered todos
			// uses todo template to set #todo-list's html
			// toggles main if there is at least one todo
			// sets the toggle all.prop to 'checked' if all todos are completed
			// calls renderFooter
			// focuses input on the #new-todo
			// runs util.store and makes a key value pair
			// 'todos-jquery': this.todos
			var todos = this.getFilteredTodos();
			$('#todo-list').html(this.todoTemplate(todos));
			$('#main').toggle(todos.length > 0);
			$('#toggle-all').prop('checked', this.getActiveTodos().length === 0);
			this.renderFooter();
			$('#new-todo').focus();
			util.store('todos-jquery', this.todos);

		},
		renderFooter: function () {
			// finds count of todos
			// finds count of active todos
			// makes a handlebars template
			// var template = this.footerTemplate({
				// 	activeTodoCount: activeTodoCount,
				// 	activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				// 	completedTodos: todoCount - activeTodoCount,
				// 	filter: this.filter
			// });
			// shows the footer if there is at least one todo
			// sets the html to the template
			var todoCount = this.todos.length;
			var activeTodoCount = this.getActiveTodos().length;
			var template = this.footerTemplate({
				activeTodoCount: activeTodoCount,
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				completedTodos: todoCount - activeTodoCount,
				filter: this.filter
			});

			$('#footer').toggle(todoCount > 0).html(template);
		},
		toggleAll: function (e) {
			// called when #toggle-all is changed
			// use prop to find out status of checkbox.
			// check it to complete all, uncheck to uncomplete all
			// use forEach on todos to change all the todo.completed's
			var isChecked = $(e.target).prop('checked');

			this.todos.forEach(function(todo) {
				todo.completed = isChecked;
			});

			this.render();
		},
		getActiveTodos: function () {
			// returns  filters the todos to return only todos where todo.completed is false
			return this.todos.filter(function(todo) {
				return !todo.completed
			});
		},
		getCompletedTodos: function () {
			// returns filters the todos to return only todos where todo.completed is true
			return this.todos.filter(function(todo) {
				return todo.completed
			});
		},
		getFilteredTodos: function () {
			// decides how todos should be filtered
			// if this.filter (the end of the url) is active, return this.getActiveTodos();
			// if this.filter (the end of the url) is completed, return this.getCompletedTodos();
			// otherwise just return all the todos
			if (this.filter === 'active') {
				return this.getActiveTodos();
			}
			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			}
			return this.todos;
		},
		destroyCompleted: function () {
			// effectively deletes completed todos  - sets the todo list to active todos 
			// sets the filter back to 'all'
			this.todos = this.getActiveTodos();
			this.filter = 'all';
			this.render();
		},
		indexFromEl: function (el) {
			// accepts an element from inside the `.item` div and
			// returns the corresponding index in the `todos` array
			var id = $(el).closest('li').data('id');
			var todos = this.todos;
			var i = todos.length;

			while (i--) {
				if (todos[i].id === id) {
					return i
				}
			}
		},
		create: function (e) {
			// trim the value
			// if the key pressed is not the enter key, OR if there is still no value
			// then return
			// this.todos.push({
				// id: util.uuid(),
				// title: val,
				// completed: false
				// });
			// set the input back to an empty string
			var $input = $(e.target);
			var val = $input.val().trim();

			if (e.which !== ENTER_KEY || !val) {
				return;
			}

			this.todos.push({
				id: util.uuid(),
				title: val,
				completed: false
			});

			$input.val('');

			this.render();
		},
		toggle: function (e) {
			// uses indexFromEl to find the position of an item and changes completed to !completed
			var i = this.indexFromEl(e.target);
			this.todos[i].completed = !this.todos[i].completed;
			this.render();
		},
		edit: function (e) {
			// 'switches to editing mode' by adding class 'editing' to the closest li element 
			// in which the todo item is contained (which is a more specific selector in css - overrides the previous css)
			// finds the class 'edit' (which is an input) and sets the value of it to itself and focuses
			var $input = $(e.target).closest('li').addClass('editing').find('.edit');
			$input.val($input.val()).focus()
		},
		editKeyup: function (e) {
			// if the key that is pressed is the enter key, then blur (to save)
			// if the key is the escape key, add .data('abort', true) and blur (which won't save)
			if (e.which === ENTER_KEY) {
				e.target.blur();
			}
			if (e.which === ESCAPE_KEY) {
				$(e.target).data('abort', true).blur();
			}
		},
		update: function (e) {
			// make a variable for the DOM element that triggered event
			// make a jQuery variable of it
			// retrieve and trim the jQuery element
			// if input is empy, call destroy and delete the item
			// if (.data('abort')) (esc was pressed) then set .data('abort') back to false (don't save the changes)
			// else find the item with indexFromEl and set it's title value to the trimmed changes
			var el = e.target;
			var $el = $(el);
			var val = $el.val().trim();

			if (!val) {
				this.destroy(e);
				return;
			}

			if ($el.data('abort')) {
				$el.data('abort', false);
			} else {
				this.todos[this.indexFromEl(el)].title = val;
			}

			this.render();
		},
		destroy: function (e) {
			// uses indexFromEl to find the position of an item and splices it out
			this.todos.splice(this.indexFromEl(e.target), 1);
			this.render();

		}
	};

	App.init();
});
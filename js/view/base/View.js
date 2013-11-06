/**
 * Base view. Contains base interface for all views in application. It encapsulates App.mixin.Interface mixin.
 * So you can use methods like initPrivates(), initPublics() and afterInit() as well. In general this view operates
 * with a few entities: template, items, root element and the data. All of them are available in configuration (see
 * N13.configs property for details). Also, you can set these values by special setters. For example: setTemplate()
 * or setData(). Lets describe all the entities:
 *
 *   template     - is a string with html markup inside
 *   items        - nested views of current view (view inside of view inside of view...)
 *   css Path     - css query to the root DOM element, in which this view wil be rendered. By default it equals 'auto'.
 *                  It means, that view can be instantiated many times on the page. Only viewport views can exists in
 *                  one copy within the page. All other views should be reusable
 *   data         - key/value map with data, which will be applied to the template
 *   autoRender   - Means that this view should be rendered in init() method
 *
 * In general, there are two view types: Singleton (viewport) view and reusable views.
 * 1. For singleton views we should set elPath to special unique css selector ('#container', '.some-class',...).
 *    In this case, html page should contain the tag with this selector.
 * 2. Reusable views should contain 'auto' value in elPath (default value). You can just skip this parameter for that.
 *    Later, the application will apply unique ids for this views and this.el properties will be pointed to this ids.
 *    It means, that it will be unique for all view instances.
 *
 * Here is an example:
 *
 *   N13.define('App.view.MyView', {
 *       extend : 'App.view.base.View',
 *       configs: {
 *           template   : 'myTemplate',
 *           items      : ['subView1', {cl: 'subView2', title: 'Sub View'}],
 *           elPath     : '.myContainer'
 *       },
 *
 *       onBeforeRender: function () {
 *           this.callParent(arguments);
 *           this.setData({header: 'Yahoo!', footer: 'Yes!');
 *       }
 *   });
 *
 *
 * Triggered events:
 *     beforeinit    - fires before instance is created.
 *     init          - fires after instance is created.
 *     beforerender  - fires before view is rendered.
 *     render        - fires after view is rendered.
 *     beforedestroy - fires before view is destroyed.
 *     destroy       - fires after view is destroyed.
 *     beforeclear   - fires before view is cleared (DOM remove).
 *     clear         - fires after view is cleared (DOM remove).
 *     beforeshow    - fires before view is show.
 *     show          - fires after view is show.
 *     beforehide    - fires before view is hide.
 *     hide          - fires after view is hide.
 *     beforedisable - fires before view is disable.
 *     disable       - fires after view is disable.
 *     error         - fires id error is occures.
 *
 *
 * @author DeadbraiN
 * @email tmptrash@mail.ru
 */
N13.define('App.view.base.View', {
    extend  : 'Backbone.View',
    mixins  : {
        iface  : 'App.mixin.Interface',
        observe: 'App.mixin.Observer'
    },
    configs : {
        /**
         * @required
         * {String} CSS path for root DOM element, where this widget will be rendered. 'auto' means that id for child
         * views will be generated by this view and will pass to render() method. In case of 'auto' value template of
         * current view should contain the same amount of nested container tags for child views as items configuration.
         * Also, these tags must contain class='innerContainer'. So, the real value (not 'auto') should be set only in
         * viewport views. All other views should contain 'auto' value, because they can be reused. This argument is
         * related to autoIncrementId.
         */
        elPath          : 'auto',
        /**
         * {String} Means that all nested auto views will be marked with auto generated ids. This argument is related
         * to elPath.
         */
        autoIncrementId : 'auto',
        /**
         * {String} The name of the class, which should be added into the all placeholders in parent view template. If
         * some tag contains this class, it means that this is a placeholder for view with elPath === 'auto'.
         */
        containerCls    : 'innerContainer',
        /**
         * {String|Boolean} Name of the template class for current view or false if current class doesn't use template
         */
        template        : null,
        /**
         * {String} String prefix of the templates folder. It should be a folder where all templates are placed
         */
        templateNs      : 'App.template',
        /**
         * {String} Name of the static property of template class, which contains template string
         */
        templateDataProp: 'data',
        /**
         * {String} The same as templateNs, but for views folder. Folder where all views are placed.
         */
        viewNs          : 'App.view',
        /**
         * {Array} Array of view's class names or configurations, which will be inside the current view.
         * e.g.: ['libraryNavigator.View', 'libraryNavigator.MyView'] or [{cl: 'libraryNavigator.View', title: 'Yahoo!'}].
         * You can use 'cl' property to set the class name.
         */
        items           : null,
        /**
         * {Boolean} Runs render method if true in constructor
         */
        autoRender      : false,
        /**
         * {Object} map of keys/values which will be applied to the current template. You can use setData() also
         */
        data            : null,
        /**
         * {Object} Listener object. See Observer mixin for details.
         */
        listeners       : {}
    },
    statics : {
        /**
         * {Number} Start id for views. This id will be increased every time, then new view will be created.
         */
        _currentId: 0
    },

    /**
     * @const
     * {Array} Available view keys
     */
    KEYS: ['itemId', 'id', 'elPath'],


    /**
     * @interface
     * Calls before class instantiation. Can be used for pre initialization or data set. Create an array
     * of inner views instances without rendering.
     */
    onBeforeInit: N13.emptyFn,

    /**
     * @interface
     * Calls after class instantiation. Can be used for post initializing.
     * Also see onBeforeInit() method.
     */
    onAfterInit: N13.emptyFn,

    /**
     * @interface
     * Calls before render process will begin. Can be used for preparing of user data.
     * It instantiates all nested views.
     * @param {Element} el Root DOM element of the current view
     * @returns {undefined|Boolean} false means, that rendering will be stopped, all other values will approve rendering.
     */
    onBeforeRender: N13.emptyFn,

    /**
     * @interface
     * Calls after render process will begin. Can be used for applying additional elements on view.
     * Also see onBeforeRender() method.
     * @param {Element} el Root DOM element of the current view
     */
    onAfterRender: N13.emptyFn,

    /**
     * @interface
     * Calls before destroy process will begin. Can be used for destroying of nested objects or nested non standard views.
     * @returns {undefined|Boolean} false means, that destroying will be stopped, all other values will approve destroy.
     */
    onBeforeDestroy: N13.emptyFn,

    /**
     * @interface
     * Calls after view will be destroyed.
     */
    onAfterDestroy: N13.emptyFn,

    /**
     * @interface
     * Calls before clear (DOM remove) process will begin. Can be used for clearing of nested DOM nodes.
     * @returns {undefined|Boolean} false means, that clear will be stopped, all other values will approve clear.
     */
    onBeforeClear: N13.emptyFn,

    /**
     * @interface
     * Calls after view will be cleared (DOM remove).
     */
    onAfterClear: N13.emptyFn,

    /**
     * @interface
     * Calls before show method will be called. Can be used for special preparation before view will be shown.
     * @returns {undefined|Boolean} false means, that showing will be stopped, all other values will approve show.
     */
    onBeforeShow: N13.emptyFn,

    /**
     * @interface
     * Calls after show() method will be called.
     */
    onAfterShow: N13.emptyFn,

    /**
     * @interface
     * Calls before hide() method will be called. Can be used for special preparation before view will be hidden.
     * @returns {undefined|Boolean} false means, that hiding will be stopped, all other values will approve hide.
     */
    onBeforeHide: N13.emptyFn,

    /**
     * @interface
     * Calls after hide() method will be called.
     */
    onAfterHide: N13.emptyFn,

    /**
     * @interface
     * Calls before disable() method will be called.
     * @returns {undefined|Boolean} false means, that disabling will be stopped, all other values will approve disable.
     */
    onBeforeDisable: N13.emptyFn,

    /**
     * @interface
     * Calls after disable() method will be called.
     */
    onAfterDisable: N13.emptyFn,

    /**
     * @interface
     * Calls before enable() method will be called.
     * @returns {undefined|Boolean} false means, that enabling will be stopped, all other values will approve disable.
     */
    onBeforeEnable: N13.emptyFn,

    /**
     * @interface
     * Calls after enable() method will be called.
     */
    onAfterEnable: N13.emptyFn,

    /**
     * Calls every time, then item is disabled. If this method returns true, then default disable handler will be skipped
     * @param {Element} el
     * @returns {undefined|Boolean}
     */
    onItemDisable: N13.emptyFn,

    /**
     * Calls every time, then item is enabled. If this method returns true, then default enable handler will be skipped
     * @param {Element} el
     * @returns {undefined|Boolean}
     */
    onItemEnable: N13.emptyFn,


    /**
     * Private fields initializer and creator. This is just stub. In child classes we
     * can use this method without mixin. Like this:
     *
     *     initPrivates: function () {
     *         this.callParent(arguments);
     *
     *         // do something
     *     }
     */
    initPrivates: function () {
        this.callMixin('iface');

        /**
         * {Object} Instance of the template class
         * @private
         */
        this._tpl             = '';
        /**
         * {Object} This keys/values map will be applied to the current template
         * @private
         */
        this._templateData    = null;
        /**
         * {String} Original value of display CSS property for this.el element
         * @private
         */
        this._displayCssValue = 'block';
        /**
         * {Object} Map of inner views. Keys - class shortcuts, values - view instances. For example: {'viewType.MyView', new App.view.viewType.MyView()}
         * @private
         */
        this._viewMap         = {};
        /**
         * {Object} Map of inner views by itemId property. Keys - classes itemId values, values - view instances. For example: {'myId', new App.view.viewType.MyView()}
         * @private
         */
        this._itemIdMap       = {};
    },

    /**
     * Public fields initializer and creator. This is just stub. In child classes we
     * can use this method without mixin. Like this:
     *
     *     initPublics: function () {
     *         this.callParent(arguments);
     *
     *         // do something
     *     }
     */
    initPublics: function () {
        this.callMixin('iface');

        /**
         * {Boolean} true id current view has already rendered
         */
        this.rendered = false;
        /**
         * {jQuery.Element} Equivalent of the this.$el, but more abstract
         */
        this.el       = null;
    },

    /**
     * @constructor
     * Creates/initializes all private and public fields, mixins and all nested views. Please note, that this is only
     * instantiating of current and all nested classes. It's not rendering. So, after that, you can add event handlers
     * for this and all nested views.
     */
    init: function () {
        //
        // this.$el should be declared before Backbone.View will be called,
        // because Backbone.View uses it for event binding. If auto increment value is set, then
        // we should skip query. It will be done in render() method.
        //
        this._updateEl();
        this.callParent(arguments);
        this.callMixin('iface');
        this.callMixin('observe');

        this.trigger('beforeinit', this);
        this.onBeforeInit();
        this._createItems();
        this.onAfterInit();
        this.trigger('init');

        if (this.autoRender) {
            this.render();
        }
    },

    /**
     * Override this method if you want add event handlers or make some post initialization. It calls initPrivates()
     * and initPublics() methods in the constructor
     */
    afterInit: function () {
        this.callMixin('iface');

        this.setTemplate(this.template);
    },

    /**
     * @override
     * Renders current view and all nested views. You can prevent rendering in child class, if onBeforeRender()
     * method will return false.
     * @param {String} containerQuery CSS Query of the DOM tag, which contains current view.
     * @returns {Boolean|Object} true if view was rendered, this - otherwise
     */
    render: function (containerQuery) {
        var approved;

        //
        // elPath should be 'auto' or CSS Query
        //
        if (!this.elPath) {
            this.trigger('error', 'Element css path (elPath) is not set for class "' + this.className + '"');
            return false;
        }
        //
        // template can be null or valid class shortcut
        //
        if (!(this.template === null || N13.ns(this.templateNs + '.' + this.template, false))) {
            this.trigger('error', 'Invalid template in view: "' + this.className + '"');
            return false;
        }
        this._updateEl(containerQuery);
        //
        // this.el should points into the real DOM node
        //
        if (!this.el || !this.el.length) {
            this.trigger('error', 'Root element (View::el) not found for view "' + this.className + '"');
            return false;
        }

        this.trigger('beforerender', this);
        approved = this.onBeforeRender(this.el);
        if (approved === undefined || approved === true) {
            this.callParent(arguments);
            this.clear();
            if (this._tpl === '' || !N13.isString(this._tpl) || !N13.isObject(this._templateData) && this._templateData !== null) {
                this.trigger('error', 'Invalid template data in view: "' + this.className + '"');
                return false;
            }
            try {
                this.el.append(_.template(this._tpl, this._templateData));
            } catch (e) {
                this.trigger('error', 'Template data is invalid in view "' + this.className + '". Message: "' + e.message + '"');
                return false;
            }
            this._renderItems();
            this.rendered = true;
            this.onAfterRender(this.el);
            this.trigger('render', this);
        }

        return this;
    },

    /**
     * Removes all DOM nodes of this view and all nested, but the instances are still available. This method
     * is called before render() and destroy() methods.
     */
    clear: function () {
        if (this.rendered) {
            var items = this.items;
            var children;
            var approved;
            var i;
            var len;

            this.trigger('beforeclear');
            approved = this.onBeforeClear();
            if (approved === undefined || approved === true) {
                if (N13.isArray(items)) {
                    for (i = 0, len = items.length; i < len; i++) {
                        //
                        // All nested views will be removed, but instances will be available
                        //
                        items[i].clear();
                    }
                }

                if (this.el) {
                    this.el.off();
                    children = this.el.children();
                    children.off();
                    children.remove();
                }
                this.rendered = false;
                this.onAfterClear();
                this.trigger('clear');
            }
        }
    },

    /**
     * Shows current and all nested views. It uses display: xxx css property for that.
     */
    show: function () {
        if (this.rendered) {
            var items = this.items;
            var approved;
            var i;
            var len;

            this.trigger('beforeshow');
            approved = this.onBeforeShow();
            if (approved === undefined || approved === true) {
                if (N13.isArray(items)) {
                    for (i = 0, len = items.length; i < len; i++) {
                        items[i].show();
                    }
                }

                this.el.css('display', this._displayCssValue);
                this.onAfterShow();
                this.trigger('show');
            }
        }
    },

    /**
     * Hides current and all nested views. It uses display: none; css property for that.
     */
    hide: function () {
        if (this.rendered) {
            var items = this.items;
            var approved;
            var i;
            var len;

            this.trigger('beforehide');
            approved = this.onBeforeHide();
            if (approved === undefined || approved === true) {
                if (N13.isArray(items)) {
                    for (i = 0, len = items.length; i < len; i++) {
                        items[i].hide();
                    }
                }

                this._displayCssValue = this.el.css('display');
                this.el.css('display', 'none');
                this.onAfterHide();
                this.trigger('hide');
            }
        }
    },

    /**
     * Disables current and all nested views. It also adds 'disabled' class for all nested views.
     */
    disable: function () {
        if (this.rendered) {
            var items = this.items;
            var approved;
            var i;
            var len;

            this.trigger('beforedisable');
            approved = this.onBeforeDisable();
            if ((approved === undefined || approved === true)) {
                if (N13.isArray(items)) {
                    for (i = 0, len = items.length; i < len; i++) {
                        items[i].disable();
                    }
                }

                this.onAfterDisable();
                this.trigger('disable');
            }
        }
    },

    /**
     * Enables current and all nested views.
     */
    enable: function (cssPaths) {
        if (this.rendered) {
            var items     = this.items;
            var approved;
            var i;
            var len;

            this.trigger('beforeenable');
            approved = this.onBeforeEnable(cssPaths);
            if ((approved === undefined || approved === true)) {
                if (N13.isArray(items)) {
                    for (i = 0, len = items.length; i < len; i++) {
                        items[i].enable();
                    }
                }

                this.onAfterEnable(cssPaths);
                this.trigger('enable');
            }
        }
    },

    /**
     * Calls before view will be destroyed. Destroys all nested views
     * first and after that destroys itself.
     */
    destroy: function () {
        var items = this.items;
        var approved;
        var i;
        var len;

        this.trigger('beforedestroy', this);
        approved = this.onBeforeDestroy();
        if (approved === undefined || approved === true) {
            this.callMixin('observe');
            //
            // We should clear the DOM before we clears the instances
            //
            this.clear();
            if (N13.isArray(items)) {
                for (i = 0, len = items.length; i < len; i++) {
                    items[i].destroy();
                    delete items[i];
                }
            }
            //
            // We should un delegate view events, which were set in events property:
            // events: {
            //     ...
            // }
            // otherwise we'll get memory leaks and multiply events callings
            //
            this.undelegateEvents();
            this.onAfterDestroy();
            this.trigger('destroy');
        }
    },

    /**
     * Sets template string for current view. It should be called before rendering.
     * For example in onBeforeRender() method.
     * @param {String} template The name of the template class
     */
    setTemplate: function (template) {
        var Tpl = N13.ns(this.templateNs + '.' + template, false);

        if (Tpl) {
            this._tpl = Tpl[this.templateDataProp];
        }
    },

    /**
     * Sets data for template. This keys/values map will be applied to the current template
     * @param {Object} data Data to apply
     */
    setData: function (data) {
        this._templateData = data;
    },

    /**
     * Sets current nested items to this view. It should be called before rendering.
     * For example in onBeforeRender() method.
     * @param {Array} items Array of nested items (instances, but not names). See items config for details.
     */
    setItems: function (items) {
        this.items = items;
    },

    /**
     * Returns sub view by id, class shortcut or view's itemId value
     * @param {Number|String} id
     * @returns {Backbone.View|null} Instance or null if not found
     */
    getItem: function (id) {
        if (N13.isString(id)) {
            return this._itemIdMap[id] || this._viewMap[id] || null;
        } else if ($.isNumeric(id)) {
            return this.items[id] || null;
        }

        return null;
    },


    /**
     * Renders all nested items if them weren't rendered before and contain autoRender === true.
     * @private
     */
    _renderItems: function () {
        var autoIdName = this.autoIncrementId;
        var id         = this._id;
        var items      = this.items;
        var containers;
        var innerId;
        var item;
        var i;
        var len;

        if (N13.isArray(items) && items.length > 0) {
            containers = this.el.find('.' + this.containerCls);
            if (containers.length < items.length) {
                throw Error('Template of view "' + this.className + '" doesn\'t contain enough containers for nested views. Expected ' + items.length + '.');
            }
            for (i = 0, len = items.length; i < len; i++) {
                item = items[i];
                //
                // If nested view has auto generated value for id, we need to take current tag with class='innerContainer'
                // and set auto generated id to it. After that, we need to pass this new id to nested view.
                //
                innerId = (item.elPath === autoIdName ? id() : undefined);
                $(containers[i]).attr('id', innerId);
                item.render(innerId ? '#' + innerId : undefined);
            }
        }
    },

    /**
     * Updates this.el and this.$el properties. It uses this.elPath property for that. It also, call delegateEvents()
     * from Backbone.View class to bind the events.
     * @param {String=} containerQuery DOM container's CSS query for current view
     * @private
     */
    _updateEl: function (containerQuery) {
        //
        // If container DOM element for current view wasn't created before constructor was called, then we should update
        // this.$el reference and binds all events.
        //
        if (!this.el || !this.el.length) {
            try {
                if (N13.isString(containerQuery)) {
                    this.$el = this.el = $(containerQuery);
                } else {
                    this.$el = this.el = $(this.elPath === this.autoIncrementId ? null : this.elPath);
                }
            } catch (e) {
                this.trigger('error', 'Invalid elPath CSS query for view "' + this.className + '". elPath: "' + this.elPath + '"');
            }
            //
            // If current element contains two or more tags, then it buggy and we must throw an error
            //
            if (this.el && this.el.length > 1) {
                this.trigger('error', 'Found duplicate ids for view "' + this.className + '"');
            }
            //
            //
            // this._initEvents shouldn't be declared in initPrivates(), because it calls
            // before initPrivates() method call
            //
            if (!this.el || !this.el.length) {
                this._initEvents = true;
            } else if (this._initEvents) {
                this.delegateEvents();
            }
        } else if (N13.isString(containerQuery)) {
            this.$el = this.el = $(containerQuery);
        }
    },

    /**
     * Creates sub views instances and stores them in this.items property. It also registers them in ClassManager.
     * @private
     */
    _createItems: function () {
        var items     = N13.isString(this.items) ? [this.items] : this.items;
        var ns        = N13.ns;
        var isString  = N13.isString;
        var isObject  = N13.isObject;
        var instances = [];
        var viewMap   = this._viewMap;
        var itemIdMap = this._itemIdMap;
        var viewNs    = this.viewNs;
        var i;
        var len;
        var item;
        var view;

        //
        // Create an array of inner views instances without rendering
        //
        if (N13.isArray(items)) {
            for (i = 0, len = items.length; i < len; i++) {
                item = items[i];

                if (isString(item)) {
                    instances.push(view = new (ns(viewNs + '.' + item, false))());
                    viewMap[item] = view;
                    if (view.itemId) {
                        itemIdMap[view.itemId] = view;
                    }
                } else if (isObject(item)) {
                    instances.push(view = new (ns(viewNs + '.' + item.cl, false))(item));
                    viewMap[item] = view;
                    if (view.itemId) {
                        itemIdMap[view.itemId] = view;
                    }
                } else {
                    this.trigger('debug', 'Invalid nested view "' + item + '" of view "' + this.className + '". This view will be skipped.');
                }
            }
            this.items = instances;
        }
    },

    /**
     * Returns views wide unique id. Every new call of this method returns new unique id.
     * @return {String} Unique id
     */
    _id: function () {
        // TODO: should be rewritten with this.self. For now self property doesn't work properly
        return 'view-' + (++App.view.base.View._currentId);
    }
});
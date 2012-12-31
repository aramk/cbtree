//
// Copyright (c) 2010-2013, Peter Jekel
// All rights reserved.
//
//  The Checkbox Tree (cbtree), also known as the 'Dijit Tree with Multi State Checkboxes'
//  is released under to following three licenses:
//
//  1 - BSD 2-Clause               (http://thejekels.com/cbtree/LICENSE)
//  2 - The "New" BSD License       (http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L13)
//  3 - The Academic Free License   (http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L43)
//
//  In case of doubt, the BSD 2-Clause license takes precedence.
//
define(["dojo/_base/declare",   // declare
        "dojo/_base/lang",      // lang.hitch()
        "dojo/when",            // when()
        "./TreeStoreModel",
        "../shim/Array"          // ECMA-262 Array shim
       ], function (declare, lang, when, TreeStoreModel) {

    // module:
    //    cbtree/model/ForestStoreModel
    // summary:
    //    Implements cbtree/models/model API connecting to any store that exposes
    //    the dojo/store/api/Store API or extended cbtree/store/api/Store API.

  var  moduleName = "cbTree/model/ForestStoreModel";

  return declare([TreeStoreModel], {

    //==============================
    // Keyword arguments (kwArgs) to constructor

    // rootId: String
    //    ID of fabricated root item (See also: forest)
    rootId: "$root$",

    // rootLabel: String
    //    Alternative label of the root item
    rootLabel: "ForestRoot",

    // End Parameters to constructor
    //==============================

    // _forest: Boolean
    //    See cbtree/model/TreeStoreModel for a detailed description.
    _forest: true,

    // =======================================================================
    // Constructor

    constructor: function(/* Object */ kwArgs) {
      // summary:
      //    Passed the arguments listed above (store, etc)
      // tags:
      //    private

      var root  = { id: this.rootId, root: true };
      var store = this.store;
      var model = this;

      root[this.checkedAttr] = this.checkedState;
      root[this.labelAttr]   = this.rootLabel || this.rootId;

      // Get a query function from the store's Query Engine which we can use to
      // determine if an item is a child of the forest root.
      if (typeof store.queryEngine == "function") {
        this._rootQuery = store.queryEngine( this.query );
      } else {
        throw new Error(moduleName+"::_createForestRoot(): store has no query engine");
      }
      this._forest = true;
      this.root    = root;
    },

    getParents: function (/*Object*/ storeItem) {
      // summary:
      //    Get the parent(s) of a store item. This model supports both single
      //    and multi parented store objects.  For example: parent:"Homer" or
      //    parent: ["Homer","Marge"]. Multi parented stores must have a query
      //    engine capable of querying properties whose value is an array.
      // storeItem:
      //    The store object whose parent(s) will be returned.
      // returns:
      //    A dojo/promise/Promise  -> Object[]
      // tags:
      //    private

      var result = this.inherited(arguments);
      var self   = this;

      return result.then( function (parents) {
        if (self.isChildOf(self.root, storeItem)) {
          parents.push(self.root);
        }
        return parents;
      });
    },

    // =======================================================================
    // Inspecting items

    getIdentity: function(/*item*/ item) {
      // summary:
      //    Get the identity of an item.
      return (item == this.root ? this.root.id : this.store.getIdentity(item));
    },

    isChildOf: function (/*Object*/ parent, /*Object*/ item) {
      // summary:
      //    Test if an item if a child of a given parent.
      // parent:
      //    The parent object.
      // child:
      //    Child object.
      // returns:
      //    Boolean true or false
      // tag:
      //    Public
      if (parent && item) {
        if (parent == this.root) {
          return (this._rootQuery.matches ? this._rootQuery.matches(item)
                                           : !!this._rootQuery([item]).length);
        }
        return this.inherited(arguments);
      }
      return false;
    },

    // =======================================================================
    // Write interface

    _setValue: function (/*Object*/ item, /*String*/ property, /*any*/ value) {
      // summary:
      //    Set the new value of a store item property and fire the 'onChange'
      //    event if the store is not observable, not evented or when the item
      //    is the forest root.
      //item:
      //    Store object
      // property:
      //    Object property name
      // value:
      //    New value to be assigned.
      // tag:
      //    Private

      if (item[property] !== value) {
        if (item == this.root) {
          var orgItem = this._objectCache[this.root.id] = lang.mixin(null, item);
          item[property] = value;
          this._onChange(item, orgItem);
        } else {
          this.inherited(arguments);
        }
      }
      return value;
  },

    // =======================================================================
    // Internal event listeners.

    onSetItem: function (/*dojo.store.item*/ storeItem, /*string*/ property, /*AnyType*/ oldValue,
                          /*AnyType*/ newValue) {

      // If the property that changed is part of the root query go check if the
      // item attached to or detached from the root.
      if (this.query && property in this.query) {
        var self = this;

        when( this.childrenCache[this.root.id], function (children) {
					var childIndex   = children ? children.indexOf(storeItem) : -1;
          var isRootChild  = self.isChildOf(self.root, storeItem);
          var wasRootChild = (childIndex > -1);

					// If the children of the tree root changed update the childrens cache
					// BEFORE calling onRootChange(). This will prevents an infinite loop
					// in case any listener changes any of the item's query properties or
					// does a store put() which could result in another call to this
					// onSetItem() method before _childrenChanged() is called...

          if (isRootChild != wasRootChild) {
						var operation = isRootChild ? "attach" : "detach";
						var children = self._updateChildrenCache( operation, self.root, storeItem );
						when ( children, function() {
							self.onRootChange(storeItem, operation);
							self._childrenChanged(self.root);
						});
          }
        });
      }
      this.inherited(arguments);
    },

    toString: function () {
      return "[object ForestStoreModel]";
    }

  });
});
(function (global) {

  Ext.override(Rally.env.Server, {
    getWsapiUrl: function(version) {
      return this.getContextUrl() + "/webservice/1.43";
    }
  });

  
  var filterTags = [];
  
  var defaultQuery = Ext.create('Rally.data.QueryFilter', {
    property: 'ObjectID',
    operator: '!=',
    value: '0'
  });
  
  var renderTask = function renderTask(p, val, __, rec) {
    if (rec && rec.get) {
      if (rec.raw._type.toLowerCase() !== "task") {
        if (rec.raw.hasOwnProperty(p)) {
          return rec.raw[p];
        }
      }
    }

    return val;
  };

  Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    childTypes: {
      defect: false,
      task: false,
      testcase: false
    },

    mixins: {
      maskable: "Rally.ui.mask.Maskable"
    },

    loading: null,

    _queryFilter: defaultQuery,

    launch: function() {
      var me = this;

      me.maskTarget = me.el;

      me.showLoading();

      var appId = me.getAppId();

      me.add(Ext.create("Ext.Panel", {
        border: false,
        layout: 'anchor',
        margin: '15 0 0 0',
        padding: '0 0 0 0',
        height: 75,
        width: '100%',
        items: [
          {
            width: '100%',
            anchor: '100% 45',
            border: false,
            layout: 'hbox',
            items: [
              {
                xtype: 'tbspacer',
                flex: 1
              },
              {
                // query string
                xtype: 'textareafield',
                itemId: 'query-textbox',
                fieldLabel: 'Query',
                labelAlign: 'right',
                stateful: true,
                stateId: 'portfoliodrilldown-query-textbox-' + appId,
                width: 400,
                listeners: {
                  scope: me,
                  specialkey: function(field, e) {
                    if (e.getKey() == e.ENTER) {
                      var cb = me.down("#typecb");
                      me._applyFilter(cb);
                    }
                  }
                }
              },
              {
                // query trigger button
                xtype: 'rallybutton',
                text: 'Go',
                handler: function() {
                  var cb = me.down("#typecb");
                  me._applyFilter(cb);
                },
                scope: me
              },
              {
                xtype: 'tbspacer',
                flex: 1
              },
              {
                xtype: 'rallymultiobjectpicker',
                fieldLabel: 'Tag',
                labelAlign: 'right',
                modelType: 'tag',
                listeners : {
                    collapse : function( field, eOpts ) {
                        //console.log("this",this);
                        //console.log("selected",field.getValue());
                        var cb = this.down("#typecb");
                        filterTags = field.getValue().length > 0 ?
                            field.getValue() : [];
                        this._applyFilter(cb);
                    },
                    scope : this
                }
              },
              {
                xtype: 'tbspacer',
                flex: 1
              },
              me._createTypeSelector(),
              {
                xtype: 'tbspacer',
                width: 10
              }
            ]
        }]
      }));
    },

    showLoading: function() {
      var me = this;

      me.showMask("Loading...");
    },

    hideLoading: function() {
      var me = this;

      me.hideMask();
    },

    _createTypeSelector: function _createViewSelector() {
      var cb = Ext.create("Rally.ui.combobox.PortfolioItemTypeComboBox", {itemId : "typecb"});

      cb.on("ready", function(value) { 
        //console.log("Loaded", arguments); 
        cb.on("change", this._applyFilter, this);
        this._applyFilter(cb, value);
      }, this);

      return cb;
    },

    _createTypeToStateFieldMap: function _createTypeToStateFieldMap(model) {
      //console.dir(model);

      var type = model.superclass.self.typePath.toLowerCase();
      var stateToFind = null;
      var ssf = null,
          i, ii,
          f;

      if (type.indexOf("portfolioitem/") >= 0) {
        stateToFind = "State";
      } else if ((type === "hierarchicalrequirement") || (type === "defect")) {
        stateToFind = "ScheduleState";
      } else if (type === "task") {
        stateToFind = "State";
      }

      if (stateToFind === null) {
        return null;
      }

      f = model.getFields();
      for (i = 0, ii = f.length; i < ii; i++) {
        if (f[i].name === stateToFind) {
          ssf = f[i];
          break;
        }
      }

      return ssf;
    },

    _applyQueryFilter: function() {
      var me = this;
      var i;
      var querytextbox;
      var queryString;
      var parser;
      var nextTagQuery;
      var tagQuery = null;
      
      var filter = defaultQuery;
      var fieldStyle = 'color: black';

      querytextbox = me.down('#query-textbox');

      queryString = Ext.String.trim(querytextbox.getValue());
      if (queryString) {
        parser = Ext.create('Rally.data.util.QueryStringParser', {
          string: queryString
        });
        try {
          filter = parser.parseExpression();
        }
        catch (err) {
          fieldStyle = 'color: red';
        }
      }

      for (i = 0; i < filterTags.length; i++) {
        nextTagQuery = Ext.create('Rally.data.QueryFilter', {
          property: 'Tags.Name',
          operator: '=',
          value: filterTags[i].Name
        });

        if (i === 0) {
          tagQuery = nextTagQuery;
        } else {
          tagQuery = tagQuery.or(nextTagQuery);
        }
      }

      if (tagQuery) {
        filter = filter.and(tagQuery);
      }

      me._queryFilter = filter;
      querytextbox.setFieldStyle(fieldStyle);
    },

    _applyFilter: function _applyFilter(sender, newVal, oldVal, eOpts) {
      var i, ii;
      var me = this;

      me._applyQueryFilter();

      this._types = [];
      this._childTypes = [];
      
      for (i = 0, ii = sender.store.data.items.length; i < ii; i++) {
        this._types.push(sender.store.data.items[i].data.TypePath.toLowerCase());
        this._childTypes.push(sender.store.data.items[i].data.TypePath.toLowerCase());
      }

      this._types.push("hierarchicalrequirement");
      this._types.push("task");
      this._types.push("defect");

      this._childTypes.push("hierarchicalrequirement");
      this._childTypes.push("task");
      this._childTypes.push("defect");

      this._childTypes.splice(0, sender.store.data.items.length - sender.valueModels[0].data.Ordinal);

      newVal = sender.valueModels[0].data;

      me.showLoading();

      if (this._treePanel) {
        this.remove(this._treePanel);
      }

      Rally.data.TreeModelFactory.getModels({
        types: me._types,
        success: function modelSuccess(models) {
          var m;

          me._stateFields = {};
          me.model = models[newVal.TypePath.toLowerCase()];

          for (m in models) {
            if (models.hasOwnProperty(m)) {
              me._stateFields[m] = me._createTypeToStateFieldMap(models[m]);
            }
          }

          //console.dir(me._stateFields);

          var doLoad = function(childModels) {
            //console.log("Child models", childModels);
            me.store = Ext.create('Rally.data.WsapiTreeStore', {
              topLevelModels: [ newVal.TypePath.toLowerCase() ],
              childModels: childModels,
              query: me._queryFilter
            });

            me._onLoadData(newVal);
          };

          doLoad(me._childTypes);
        }
      });
    },

    _onLoadData: function _onLoadData(newVal) {
      var me = this;

      //console.log("Loading data", newVal);
      var appId = me.getAppId();

      me._treePanel = Ext.create('Rally.ui.tree.grid.Panel', {
        store: me.store,
        models: [me.model],
        stateful: true,
        stateId: 'portfoliodrilldown-treegrid-' + appId,
        dockedItems: [{
          xtype: 'rallypagingtoolbar',
          store: me.store,   // same store TreeGridPanel is using
          dock: 'bottom',
          displayInfo: true,
          listeners: {
            beforechange: function () {
              this.showLoading();
            },
            scope: me
          }
        }],
        listeners: {
          load: function() { me.hideLoading(); }
        },
        columnCfgs: [
          "Name",
          "Priority",
          "PreliminaryEstimate",
        //   "Release",
            {
                dataIndex : 'Release',
                text: 'Release',
                renderer: function (value, metaData, record) {
                    return value !== undefined && value !== null ? value._refObjectName : null;                    
                }
            },
           {
            xtype: 'templatecolumn',
            tpl: Ext.create('Rally.ui.renderer.template.PercentDoneByStoryPlanEstimateTemplate2'),
            text: '% Done By Plan Estimate',
            dataIndex: 'PercentDoneByPlanEstimate'
            //flex: 1
          }, {
            xtype: 'templatecolumn',
            tpl: Ext.create('Rally.ui.renderer.template.PercentDoneByStoryPlanEstimateTemplate2', {
              percentDoneName: 'PercentDoneByStoryCount'
            }),
            text: '% Done By Story Count',
            dataIndex: 'PercentDoneByStoryCount'
            //flex: 1
          },
          "AcceptedLeafStoryCount",
          "LeafStoryCount",
          "LeafStoryPlanEstimateTotal",
            {
                text: 'PlanEstimate',
                dataIndex: 'PlanEstimate',
                flex: 1
            },
          "ScheduleState",
          {
            text: 'Task Est.',
            dataIndex: 'Estimate',
            renderer: Ext.bind(renderTask, me, ["TaskEstimateTotal"], 0),
            //flex: 1,
            hidden: true
          },
          {
            text: 'To Do',
            dataIndex: 'ToDo',
            renderer: Ext.bind(renderTask, me, ["TaskRemainingTotal"], 0),
            //flex: 1,
            hidden: true
          }, 
            {
                text: 'State',
                renderer: function (value, metaData, record) {
                    var type = record.data._type.toLowerCase();
                    var res = "";
                    res = me._stateFields[type].renderTpl.apply(record.data);
                    return res;
                }
            },
            "PlanEstimate"
        ]

      });

      me._treePanel.on("load", function() { me.hideLoading(); });
      me.add(me._treePanel);
    }
  });
}(this));

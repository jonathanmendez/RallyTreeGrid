Ext.define('MyApp.feature.TreeFiltersFeature', {
  extend: 'Ext.ux.grid.FiltersFeature',
  alias: 'feature.treefilters',

  //overridden method
  getGridPanel: function () {
    return this.getTreePanel();
  },

  getTreePanel: function () {
    return this.view.up('treepanel');
  },

  //overridden method
  reload: function () {
    var treeStore = this.view.getTreeStore();
    if (this.local) {
      console.log("in local");
      console.log('record filter: ', this.getRecordFilter);
      console.log('filter: ', treeStore.filter);
      //treeStore.clearFilter(true);
      treeStore.filter([
        {
          fn: this.getRecordFilter(),
          scope: this
        }
      ]);
    } else {
      this.deferredUpdate.cancel();
      treeStore.loadPage(1);
    }
  }

});

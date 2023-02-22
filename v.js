function VirtualDOM(config) {
			var width = (config && config.width + 'px') || '100%';
			var height = (config && config.height + 'px') || '100%';
			var itemHeight = this.itemHeight = config.itemHeight || 55;
			var headerHeight = this.headerHeight = config.headerHeight || 55;
			var borderSize = this.borderSize = config.borderSize || 1;
			var minColWidth = this.minColWidth = config.minColWidth || 240;

			this.nightMode = config.nightMode || false;
			this.roundOffDigits = config.roundOffDigits || 2;
			this.items = config.items;
			this.columns = config.columns;
			this.generatorFn = config.generatorFn || null;
			this.totalRows = config.totalRows || (config.items && config.items.length);
			this.onRenderRow = config.onRenderRow || null;
			this.onLoad = config.onLoad || null;
			this.onScrollStopped = config.onScrollStopped || null;
			this.getData = function(){
				var filteredArray = [];
				this.items.forEach(function(item){
					var itemArray = {};
					Object.keys(item).forEach(function(key){
						itemArray[key] = item[key].data
					});
					filteredArray.push(itemArray);
				});
				return filteredArray;
			}

			var scroller = VirtualDOM.createScroller((itemHeight) * this.totalRows);
			var header = VirtualDOM.createHeader(this.columns, this.headerHeight, this.borderSize, this.minColWidth);
			scroller.append(header);
			this.container = VirtualDOM.createContainer(width, height);
			this.container.append(scroller);

			var screenItemsLen = Math.ceil(config.height / itemHeight);

			this.cachedItemsLen = screenItemsLen * 3;
			this._renderChunk(this.container, 0);

			if(typeof this.onLoad === 'function'){
				this.onLoad();
			}

			var self = this;
			var lastRepaintY = 1;
			var maxBuffer = screenItemsLen * itemHeight;
			var vdomContainer = $('#'+config.containerId);
			var scrollTimeout = null;

			function onScroll(e) {

				if(scrollTimeout){
					clearTimeout(scrollTimeout);
				}

				e = e || window.event;
				var te = e.target || e.srcElement;
				var scrollTop = te.scrollTop;
				if (!lastRepaintY || Math.abs(scrollTop - lastRepaintY) > maxBuffer) {
					var first = parseInt(scrollTop / itemHeight) - screenItemsLen;
					self._renderChunk(self.container, first < 0 ? 0 : first);
					lastRepaintY = scrollTop;
				}

				e.preventDefault && e.preventDefault();

				vdomContainer.find('[vdom-rm="1"]').remove();

				scrollTimeout = setTimeout(function(){
					if(typeof self.onScrollStopped !== 'undefined'){
						var rows = vdomContainer.find('[vdom-type="row"]');
						self.onScrollStopped(rows);
					}
				},500);

			}

			this.container.bind({
				scroll: onScroll,
			});

			var rowContainer = $('<div>');
			rowContainer.addClass('vdom-instance');
			rowContainer.css('height', config.height + 'px');
			rowContainer.css('width', config.width + 'px');
			rowContainer.append(this.container);

			vdomContainer.html(rowContainer);

			this.addRow = function(array){
				var newObj = JSON.parse(JSON.stringify(array));
				this.items.push(newObj);
				this.totalRows++;
				scroller.css('height', (itemHeight) * this.totalRows);
				var first = parseInt(this.container.attr('vdom-lry'));
				this._renderChunk(this.container, first < 0 ? 0 : first);
				vdomContainer.find('[vdom-rm="1"]').remove();
			}

			this.removeRow = function(i){
				this.items.splice(i, 1);
				this.totalRows--;
				scroller.css('height', (itemHeight) * this.totalRows);
				var first = parseInt(this.container.attr('vdom-lry'));
				this._renderChunk(this.container, first < 0 ? 0 : first);
				vdomContainer.find('[vdom-rm="1"]').remove();
			}

			this.removeAllRows = function(){
				this.items = [];
				this.totalRows = 0;
				this._renderChunk(this.container, 0);
				vdomContainer.find('[vdom-rm="1"]').remove();
			}

		}

		VirtualDOM.createHeader = function(columns,height,borderSize,minColWidth, colWidth){
			var header = $('<div>');
			header.css('height',height + 'px');
			header.css('display', 'flex');
			header.css('align-items', 'center');
			header.css('flex-wrap', 'nowrap');
			header.css('position', 'sticky');
			header.css('width', '100%');
			header.css('top', 0);
			if(this.nightMode){
				header.css('background', '#212744');
			} else {
				header.css('background', '#f5f5f5');
			}
			header.css('z-index', 8);
			columns.forEach(function(column){
				var col = $('<div>');
				var colContent = column.header;
				if(typeof column.htmlHeader !== 'undefined' && column.htmlHeader){
					col.append(colContent);
				} else {
					col.text(colContent);
				}
				if(typeof column.hidden !== 'undefined' && column.hidden){
					col.css('display', 'none');
					col.prop('hidden', true);
					col.addClass('vdom-hidden');
				} else {
					col.css('display', 'flex');
				}
				col.css('font-weight', 'bold');
				col.css('height', height + 'px');
				col.css('align-items', 'center');
				col.css('flex-basis', 0);
				if(this.nightMode){
					col.css('border-bottom', borderSize+'px solid #414561');
					col.css('border-right', borderSize+'px solid #414561');
				} else {
					col.css('border-bottom', borderSize+'px solid #eee');
					col.css('border-right', borderSize+'px solid #eee');
				}
				col.css('overflow', 'hidden');
				col.css('padding', '7px 10px');
				col.css('font-size','0.85rem');
				if(typeof column.width !== 'undefined' && column.width){
					col.css('min-width', column.width + 'px');
					col.css('max-width', column.width +'px');
				} else {
					col.css('min-width', minColWidth + 'px');
					col.css('flex-grow', 1);
				}
				if(this.nightMode){
					col.css('background', '#212744');
				} else {
					col.css('background', '#f5f5f5');
				}
				header.append(col);
			});
			return header;
		}

		VirtualDOM.prototype.createRow = function(i) {
			var item;
			if (this.generatorFn)
				item = this.generatorFn(i,this.items);
			else if (this.items) {
				item = $('<div>');
				item.css('height', this.itemHeight + 'px');
				item.css('display', 'flex');
				item.css('align-items', 'center');
				item.css('flex-wrap', 'nowrap');

				for( var j=0;j<this.columns.length;j++){
					var column=this.columns[j];
					var itemObj = this.items[i][column.field];
					if (typeof itemObj == 'string') {
						var celdaContent = $('<div>');
						celdaContent.append(itemObj);
					} else {
						if(typeof column.htmlContent !== 'undefined' && column.htmlContent){
							var celdaContent = $(itemObj.content);
						} else {
							if(typeof itemObj.element !== 'undefined' && itemObj.element){
								var celdaContent = $('<'+itemObj.element+'>');
							} else {
								var celdaContent = $('<div>');
							}
							if(typeof column.amount !== 'undefined' && column.amount){
								if(typeof this.roundOffDigits !== 'undefined'){
									celdaContent.text($.number(itemObj.content, this.roundOffDigits));
								} else {
									celdaContent.text(itemObj.content);
								}
							} else {
								celdaContent.text(itemObj.content);
							}
						}
					}
					if(typeof column.width !== 'undefined' && column.width){
						celdaContent.css('width', (column.width - 20) +'px');
					}
					if(typeof itemObj.attr !== 'undefined' && itemObj.attr){
						Object.keys(itemObj.attr).forEach(function(key){
							celdaContent.attr(key,itemObj.attr[key]);
						});
					}
					if(typeof itemObj.data !== 'undefined' && itemObj.data){
						Object.keys(itemObj.data).forEach(function(key){
							celdaContent.data(key,itemObj.data[key]);
						});
					}
					if(typeof column.amount !== 'undefined' && column.amount){
						celdaContent.css('text-align', 'right');
					}
					celdaContent.addClass('vdom-content');
					celdaContent.attr('vdom-rowid',i);
					celdaContent.attr('vdom-colid',column.field);
					var celda = $('<div>');
					if(typeof column.hidden !== 'undefined' && column.hidden){
						celda.css('display', 'none');
						celda.prop('hidden', true);
						celda.addClass('vdom-hidden');
					} else {
						celda.css('display', 'flex');
					}
					celda.addClass('vdom-col');
					celda.attr('vdom-rowid',i);
					celda.attr('vdom-colid',column.field);
					if(typeof itemObj.id !== 'undefined'){
						celdaContent.attr('vdom-itemid',itemObj.id);
					}
					celda.append(celdaContent);
					celda.css('height', this.itemHeight + 'px');
					celda.css('flex-direction', 'column');
					if(typeof column.contentTruncate !== 'undefined' && column.contentTruncate){
						celda.css('text-overflow', 'ellipsis');
						celda.css('overflow', 'hidden');
					}
					if(typeof column.amount !== 'undefined' && column.amount){
						celda.css('align-items', 'end');
					}
					celda.css('justify-content', 'center');
					celda.css('flex-basis', 0);
					if(this.nightMode){
						celda.css('border-bottom', this.borderSize+'px solid #414561');
						celda.css('border-right', this.borderSize+'px solid #414561');
					} else {
						celda.css('border-bottom', this.borderSize+'px solid #eee');
						celda.css('border-right', this.borderSize+'px solid #eee');
					}
					//celda.css('overflow', 'hidden');
					celda.css('padding', '7px 10px');
					celda.css('font-size','1rem');
					if(typeof column.width !== 'undefined' && column.width){
						celda.css('min-width', column.width + 'px');
						celda.css('max-width', column.width +'px');
					} else {
						celda.css('min-width', this.minColWidth + 'px');
						celda.css('flex-grow', 1);
					}
					celda.attr('vdom-type','col');
					item.append(celda);
				}
			}

			item.addClass('vdom-row');
			item.attr('vdom-rowid',i);
			item.css('position', 'absolute');
			item.css('width', '100%');
			item.css('top', ((this.itemHeight * i) + this.headerHeight) + 'px');
			item.attr('vdom-type','row');
			return item;
		};

		VirtualDOM.prototype._renderChunk = function(node, from) {
			var finalItem = from + this.cachedItemsLen;
			if (finalItem > this.totalRows)
				finalItem = this.totalRows;

			var fragment = $(document.createDocumentFragment());
			for (var i = from; i < finalItem; i++) {
				var el = this.createRow(i);
				fragment.append(el);
				if(typeof this.onRenderRow !== 'undefined' && this.onRenderRow){
					var rowid = i;
					this.onRenderRow(rowid, el);
				}
			}

			for (var j = 1, l = node.children().length; j < l; j++) {
				node.children().eq(j).css('display','none');
				node.children().eq(j).attr('vdom-rm', '1');
			}
			node.append(fragment);
			node.attr('vdom-lry', from);
		};

		VirtualDOM.createContainer = function(w, h) {
			var c = $('<div>');
			c.css('width', w);
			c.css('height', h);
			c.css('overflow', 'auto');
			c.css('position', 'relative');
			c.css('padding', 0);
			if(this.nightMode){
				c.css('border', '1px solid #414561');
			} else {
				c.css('border', '1px solid #eee');
				c.css('color', '#626262');
			}
			return c;
		};

		VirtualDOM.createScroller = function(h) {
			var scroller = $('<div>');
			scroller.css('position', 'relative');
			scroller.css('top', 0);
			scroller.css('left', 0);
			scroller.css('width', '100%');
			scroller.css('height', h + 'px');
			return scroller;
		};

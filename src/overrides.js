/* overrides.js is part of Aloha Editor project http://aloha-editor.org
 *
 * Aloha Editor is a WYSIWYG HTML5 inline editing library and editor.
 * Copyright (c) 2010-2013 Gentics Software GmbH, Vienna, Austria.
 * Contributors http://aloha-editor.org/contribution.php
 *
 * Refernces:
 * http://www.w3.org/TR/CSS2/propidx.html
 * https://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#value
 * https://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#state
 * https://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#value-override
 * https://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#state-override
 */
define([
	'dom',
	'misc',
	'maps',
	'boundaries',
	'traversing'
], function Overrides(
	Dom,
	Misc,
	Maps,
	Boundaries,
	Traversing
) {
	'use strict';

	var nodeToState = {
		'A'      : 'createLink',
		'U'      : 'underline',
		'B'      : 'bold',
		'STRONG' : 'bold',
		'I'      : 'italic',
		'EM'     : 'italic',
		'STRIKE' : 'strikethrough',
		'SUB'    : 'subscript',
		'SUP'    : 'superscript'
	};

	/**
	 * Any element whose node name corresponds with the given command states
	 * ("bold", "italic", "underline", "strikethrough"), must also have the
	 * associated style property match the expected value, otherwise that
	 * element's state is considered nullified by the CSS styles that has been
	 * applied to it.
	 */
	var stateToStyle = {
		'bold'          : ['fontWeight', 'bold', null],
		'italic'        : ['fontStyle', 'italic', null],
		'underline'     : ['textDecoration', 'underline', 'none'],
		'strikethrough' : ['textDecoration', 'line-through', 'none']
	};

	var overrideToNode = {
		'createLink'    : 'A',
		'underline'     : 'U',
		'bold'          : 'B',
		'italic'        : 'I',
		'strikethrough' : 'STRIKE',
		'subscript'     : 'SUB',
		'superscript'   : 'SUP'
	};

	var overrideToValue = {
		'hilitecolor' : 'background-color',
		'backcolor'   : 'background-color',
		'fontname'    : 'font-family',
		'fontsize'    : 'font-size',
		'fontcolor'   : 'color'
	};

	var styles = [
		'textTransform',

		'backgroundColor',

		'color',
		'fontSize',
		'fontFamily',

		'border',
		'borderColor',
		'borderStyle',
		'borderWidth',

		'borderTop',
		'borderTopColor',
		'borderTopStyle',
		'borderTopWidth',

		'borderBottom',
		'borderBottomColor',
		'borderBottomStyle',
		'borderBottomWidth',

		'borderLeft',
		'borderLeftColor',
		'borderLeftStyle',
		'borderLeftWidth',

		'borderRight',
		'borderRightColor',
		'borderRightStyle',
		'borderRightWidth'
	];

	function statesFromStyles(elem) {
		var states = [];
		Maps.forEach(stateToStyle, function (style, state) {
			var value = Dom.getStyle(elem, style[0]);
			if (value) {
				if (style[2]) {
					if (value === style[2]) {
						states.push([state, false]);
					} else if (value === style[1]) {
						states.push([state, true]);
					}
				} else {
					states.push([state, value === style[1]]);
				}
			}
		});
		return states;
	}

	function getStates(elem) {
		if (Dom.isTextNode(elem)) {
			return [];
		}
		var state = nodeToState[elem.nodeName];
		return (state ? [[state, true]] : []).concat(statesFromStyles(elem));
	}

	function valuesFromStyles(elem) {
		var values = [];
		styles.forEach(function (style) {
			var value = Dom.getStyle(elem, style);
			if (value) {
				values.push([style, value]);
			}
		});
		return values;
	}

	function getValues(elem) {
		return Dom.isTextNode(elem) ? [] : valuesFromStyles(elem);
	}

	function harvest(node, until) {
		var overrides = [];
		var nodes = Traversing.childAndParentsUntil(
			node,
			until || Dom.isEditingHost
		);
		var map = {};
		var i = nodes.length;
		var j;
		var len;
		var states;
		var state;
		var index;
		while (i--) {
			states = getStates(nodes[i]);
			for (j = 0, len = states.length; j < len; j++) {
				state = states[j];
				index = map[state[0]];
				if (Misc.defined(index)) {
					overrides.splice(index - 1, 1, null);
				}
				map[state[0]] = overrides.push(state);
			}
			overrides = overrides.concat(getValues(nodes[i]));
		}
		for (i = 0, len = overrides.length; i < len; i++) {
			if (!overrides[i]) {
				overrides.splice(i, 1);
			}
		}
		return overrides;
	}

	function consume(boundary, overrides) {
		var override = overrides.pop();
		var node;
		var wrapper;
		while (override) {
			if (overrideToNode[override[0]]) {
				// TODO: implement handling for false overrides states
				var wrapper = document.createElement(overrideToNode[override[0]]);
				if (node) {
					Dom.wrap(node, wrapper);
				} else {
					Dom.insertNodeAtBoundary(wrapper, boundary);
					boundary = [wrapper, 0];
				}
				node = wrapper;
			} else {
				if (!node) {
					node = document.createElement('span');
					Dom.insertNodeAtBoundary(node, boundary);
					boundary = [node, 0];
				}
				Dom.setStyle(node, override[0], override[1]);
			}
			override = overrides.pop();
		}
		return boundary;
	}

	var exports = {
		harvest: harvest,
		consume: consume
	};

	exports['harvest'] = exports.harvest;
	exports['consume'] = exports.consume;

	return exports;
});
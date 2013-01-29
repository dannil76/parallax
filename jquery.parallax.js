(function($) {
var vendors = ['moz', 'ms', 'o', 'webkit'];

// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
(function() {
    var lastTime = 0;
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = 
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

// wrap scroll into a requestAnimationFrame loop to throttle it a bit.
jQuery(window).scroll(function(e) {
  window.requestAnimationFrame(function() {
    jQuery(window).trigger('scroll-animated', e);
  });
});

// choose between translate3d and normal translate.
var transformBuilder = (function(use2d) {
  if(!use2d) {
    return function(opts) {
      var rules = { width: opts.width || 0, height: opts.height || 0, visibility: opts.visibility };
      rules['transform'] = 'translate3d(' + (opts.left||0) + 'px, ' + (opts.top||0) + 'px, 0)';
      for(var i=0; i<vendors.length; ++i) rules['-' + vendors[i] + '-transform'] = rules;
      return rules;
    }
  }
  return function(opts) {
    var rules = { width: opts.width || 0, height: opts.height || 0, visibility: opts.visibility };
    rules['transform'] = 'translateX(' + (opts.left||0) + 'px) translateY(' + (opts.top||0) + 'px)';
    for(var i=0; i<vendors.length; ++i) rules['-' + vendors[i] + '-transform'] = rules['transform'];
    return rules;
  }
});

// jQuery plugin
jQuery.fn.parallax = function(opts) {
  var self = this;
  $(window).on('load', function() { parallax.call(self, opts); })
}
function parallax(opts) {
  opts = jQuery.extend({
    speed: 0.2,
    use2dTransform: false,
    forceTouchSupport: false
  }, opts);
  if(window.Modernizr && Modernizr.touch && !opts.forceTouchSupport) return; // behaves weird on ios.
  
  var nodes = [], bounds = {}, transformer = transformBuilder(opts.use2dTransform);
  var wrappers = $(this).map(function() {
    var wrapper = $("<div>").addClass("parallax-wrapper").hide(), removed;
    wrapper.css({position:'fixed',top:0,left:0,overflow:'hidden',zIndex:0});
    wrapper.data('parent', $(this).parent())
           .data('width', $(this).width())
           .data('height', $(this).height());

    removed = $(this).remove();
    wrapper.data('item', removed).prependTo(document.body).append(removed);
    return wrapper[0];
  });

  function initialize() {
    bounds = { width: $(window).width(), height: $(window).height() };
    nodes.length = 0;
    wrappers.each(function() {
      var wrapper = $(this);
      var item = wrapper.data('item');
      var parent = wrapper.data('parent');
      wrapper.width(bounds.width);

      var wrapperHeight = Math.max((bounds.height * 0.7), 200);
      var width = wrapper.data('width'), height = wrapper.data('height');
      var step = bounds.height - (bounds.height - wrapperHeight) * opts.speed;
      var itemWidth = width * (step / height), itemHeight = 0;

      if(itemWidth < bounds.width) {
        itemWidth = bounds.width;
        itemHeight = height * (itemWidth / width);
      } else {
        itemHeight = bounds.height;
        itemWidth = width * (itemHeight / height);
      }

      nodes.push({
        wrapperEl: wrapper[0],
        itemEl: item[0],
        wrapper: {
          left: parent[0].offsetLeft,
          top: parent[0].offsetTop,
          width: bounds.width,
          height: wrapperHeight
        },
        item: {
          left: -(itemWidth - bounds.width) / 2,
          top: -(itemHeight - step) / 2,
          width: itemWidth,
          height: itemHeight
        }
      });
    });
  }

  function refresh() {
    var top = $(window).scrollTop();
    var bottom = top + bounds.height;
    for(var i=0; i < nodes.length; ++i) {
      var node = nodes[i];
      node.visibility = 'hidden';
      var itemTop = node._itemTop || (node._itemTop = node.item.top);
      var wrapperTop =  node._wrapperTop || (node._wrapperTop = node.wrapper.top);
      if(top < wrapperTop + node.wrapper.height && bottom > wrapperTop) {
        node.wrapper.top = wrapperTop - top;
        node.item.top = itemTop - node.wrapper.top + (node.wrapper.top * opts.speed);
        node.visibility = 'visible';
      }
      node.item.visibility = node.wrapper.visibility = node.visibility;
      $(node.wrapperEl).css(transformer(node.wrapper));
      $(node.itemEl).css(transformer(node.item));
    }
  }


  wrappers.show();
  $(window).on('load resize', function() { initialize(); refresh(); }).resize();
  $(window).on('scroll-animated', refresh);
}

})(jQuery);

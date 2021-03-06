/** @jsx React.DOM */

var Range = function(nums) {
  this.nums = nums;
};
Range.prototype = {
  rand: function(filter) {
    var nums = this.nums,
        opts = filter ? nums.filter(filter) : nums,
        n = opts.length,
        ix = Math.random() * n;
    return opts[ix|0];
  }
};
Range.fromAToB = function(a, b) {
  var nums = [];
  for (var i = a; i <= b; i++) {
    nums.push(i);
  }
  return new Range(nums);
};
Range.parse = function(s) {
  var i = s.indexOf('-');
  if (i >= 0) {
    var a = parseInt(s.substring(0, i)),
        b = parseInt(s.substring(i+1));
    return Range.fromAToB(a, b);
  }

  var nums = s.split(',').map(function(x) {
    return parseInt(x.trim());
  });

  return new Range(nums);
};

var FormatNumber = function(n) {
  var s = '' + n,
      a = [];
  while (s.length > 0) {
    a.unshift(s.substring(s.length - 3));
    s = s.substring(0, s.length - 3);
  }
  return a.join(',');
}

var Signal = function() {};
Signal.prototype = {
  listeners: [],

  tap: function(l) {
    this.listeners = this.listeners.slice(0);
    this.listeners.push(l);
  },

  untap: function(l) {
    var ix = this.listeners.indexOf(l);
    if (ix == -1) {
      return;
    }
    this.listeners = this.listeners.slice(0);
    this.listeners.splice(ix, 1);
  },

  raise: function() {
    var args = Array.prototype.slice.call(arguments, 0);
    this.listeners.forEach(function(l) {
      l.apply(this, args);
    });
  }
};

var Problem = function(op, a, b) {
  this.op = op;
  this.a = a;
  this.b = b;
};
Problem.prototype = {
  evaluate: function() {
    return this.op.eval(this.a, this.b);
  }
};
Problem.ops = [
  {
    name: '+',
    eval: function(a, b) {
      return a + b;
    },
    rand: function(range) {
      return new Problem(
        this,
        range.rand(),
        range.rand()
      );
    }
  },
  {
    name: '−',
    alias: '-',
    eval: function(a, b) {
      return a - b;
    },
    rand: function(range) {
      var a = range.rand(),
          b = range.rand();
      return new Problem(this, a + b, a);
    }
  },
  {
    name: '×',
    alias: '*',
    eval: function(a, b) {
      return a * b;
    },
    rand: function(range) {
      return new Problem(
        this,
        range.rand(),
        range.rand()
      );
    }
  },
  {
    name: '÷',
    alias: '/',
    eval: function(a, b) {
      return a / b;
    },
    rand: function(range) {
      var a = range.rand(),
          b = range.rand(function(x) {
            return x > 0;
          });
      return new Problem(this, a * b, b);
    }
  }
];
Problem.random = function(ops, range) {
  ops = ops || this.ops;
  var op = ops[(Math.random()*ops.length)|0];
  return op.rand(range);
};
Problem.emtpy = function() {
  return new Problem(Problem.ops[0], 0, 0);
};

var ParamsFromUrl = function() {
  var q = location.search;
  if (q.charAt(0) == '?') {
    q = q.substring(1);
  }
  var params = {
    num: '20',
    rng: '0-12',
    ops: '+-*'
  };
  q.split('&').forEach(function(x) {
    var p = x.split('=');
    if (p.length != 2) {
      return;
    }
    params[p[0]] = p[1];
  });
  return params;
};

var Model = {
  nextDidLoad: new Signal,

  endWasReached: new Signal,

  init: function(numStr, opsStr, rngStr) {
    var num = Math.max(5, parseInt(numStr)),
        rng = Range.parse(rngStr),
        ops = Problem.ops.filter(function(x) {
          return opsStr.indexOf(x.name) >= 0 || opsStr.indexOf(x.alias) >= 0;
        });

    var problems = [];
    for (var i = 0; i < num; i++) {
      problems.push(Problem.random(ops, rng));
    }

    this.problems = problems;
    this.score = 0;
    this.current = -1;
    this.next();
  },

  next: function() {
    var problems = this.problems;
    if (this.current == problems.length) {
      return;
    }

    this.current++;
    if (this.current == problems.length) {
      this.endWasReached.raise(this);
      return;
    }

    this.nextDidLoad.raise(this, this.problems[this.current]);
  },

  check: function(value) {
    var current = this.problems[this.current];
    if (current.evaluate() != value) {
      return false;
    }

    if (this.current == 0) {
      this.score += 1000;
    } else {
      var dt = Date.now() - this.start;
      this.score += Math.max(10000 - dt, 0) / 10;
    }
    this.start = Date.now();

    this.next();

    return true;
  }
};

var Card = React.createClass({
  componentWillMount: function() {
    var self = this;

    Model.nextDidLoad.tap(function(model, problem) {
      if (self.state.onFront) {
        self.setState({
          rear: problem,
          onFront: false
        });
      } else {
        self.setState({
          face: problem,
          onFront: true
        });
      }
    });

    Model.endWasReached.tap(function() {
      self.setState({
        visible: false
      });
    });


  },

  componentDidUpdate: function(props, state) {
    var root = this.getDOMNode();

    if (!this.state.visible) {
      root.style.setProperty('opacity', '0', '');
      return;
    }

    var frown = this.refs.frown.getDOMNode();
    if (this.state.wrong) {
      frown.style.setProperty('opacity', '1', '');
      // frown.style.setProperty('display', 'block', '');
    } else {
      // frown.style.setProperty('display', 'none', '');
      frown.style.setProperty('opacity', '0', '');
    }

    if (this.state.onFront) {
      root.classList.remove('enflip');
    } else {
      root.classList.add('enflip');
    }
    var active = this.currentAnswerRef().getDOMNode();
    active.value = '';
    active.focus();
  },

  hiddenAnswerRef: function() {
    return this.state.onFront ? this.refs.ar : this.refs.af;
  },

  currentAnswerRef: function() {
    return this.state.onFront ? this.refs.af : this.refs.ar;
  },

  getInitialState: function() {
    return {
      face: Problem.emtpy(),
      rear: Problem.emtpy(),
      onFront: false,
      visible: true,
      wrong: false
    }
  },

  inputDidBlur: function(event) {
    this.currentAnswerRef().getDOMNode().focus();
  },

  inputHasKeyDown: function(event) {
    var self = this;
    switch (event.keyCode) {
    case 13: // enter
      var ok = Model.check(parseInt(this.currentAnswerRef().getDOMNode().value));
      if (!ok) {
        self.setState({wrong: true});
        setTimeout(function() {
          self.setState({wrong: false});
        }, 500);
      }
      break;
    case 27: // esc
      this.currentAnswerRef().getDOMNode().value = '';
      break;
    }
  },

  render: function() {
    return (
      <div className="cards">
        <div className="card f">
          <div className="a">{this.state.face.a}</div>
          <div className="op">{this.state.face.op.name}</div>
          <div className="b">{this.state.face.b}</div>
          <div className="ans">
            <input ref="af"
                onBlur={this.inputDidBlur}
                onKeyDown={this.inputHasKeyDown} />
          </div>
        </div>

        <div className="card r">
          <div className="a">{this.state.rear.a}</div>
          <div className="op">{this.state.rear.op.name}</div>
          <div className="b">{this.state.rear.b}</div>
          <div className="ans">
            <input ref="ar"
                onBlur={this.inputDidBlur}
                onKeyDown={this.inputHasKeyDown} />
          </div>
        </div>

        <div ref="frown" className="frown"></div>
      </div>
    );
  }
});

var Score = React.createClass({
  componentWillMount: function() {
    var self = this;
    Model.endWasReached.tap(function(model) {
      self.setState({
        score: Model.score | 0,
        visible: true
      });
    });
  },

  componentDidMount: function() {
    this.getDOMNode().style.setProperty('opacity', '0', '');
  },

  getInitialState: function() {
    return {
      score: 0,
      visible: false
    };
  },

  componentDidUpdate: function() {
    this.getDOMNode().style.setProperty(
      'opacity',
      this.state.visible ? '1.0' : '0.0',
      '');
  },

  render: function() {
    return (
      <div className="score">
        <div className="heart">❤</div>
        <div className="text">{ FormatNumber(this.state.score) }</div>
      </div>
    );
  }
});

var Root = React.createClass({
  layout: function() {
    var rel = this.getDOMNode(),
        cel = this.refs.card.getDOMNode(),
        sel = this.refs.score.getDOMNode();

    rel.style.removeProperty('transform');

    var rect = cel.getBoundingClientRect(),
        ww = window.innerWidth,
        wh = window.innerHeight,
        fx = Math.min(1.0, wh / (rect.height + 70)),
        cw = rect.width * fx,
        ch = rect.height * fx,
        cx = ww / 2 - cw / 2,
        cy = wh / 2 - ch / 2;

    rel.style.setProperty('transform', 'scale(' + fx + ')', '');
    rel.style.setProperty('transform-origin', 'top center', '');
    cel.style.setProperty('left', cx + 'px', '');
    cel.style.setProperty('top', cy + 'px', '');
    sel.style.setProperty('left', cx + 'px', '');
    sel.style.setProperty('top', cy + 'px', '');
  },

  componentDidMount: function() {
    var self = this;
    window.addEventListener('resize', function(event) {
      self.layout();
    }, false);
    this.layout();
  },

  render: function() {
    return (
      <div>
        <Card ref="card" />
        <Score ref="score" />
      </div>
    );
  }
});

React.renderComponent(
  <Root />,
  document.getElementById('root')
);

var params = ParamsFromUrl();
Model.init(params.num, params.ops, params.rng);
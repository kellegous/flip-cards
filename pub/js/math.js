/** @jsx React.DOM */

var Rand = function(range) {
  return ((range+1) * Math.random()) | 0;
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
        Rand(range),
        Rand(range)
      );
    }
  },
  {
    name: '−',
    eval: function(a, b) {
      return a - b;
    },
    rand: function(range) {
      var a = Rand(range);
      return new Problem(
        this,
        a,
        Rand(a)
      );
    }
  }
];
Problem.random = function(range) {
  var ops = this.ops,
      op = ops[(Math.random()*ops.length)|0];
  return op.rand(range);
};
Problem.emtpy = function() {
  return new Problem(Problem.ops[0], 0, 0);
};

var Model = {
  nextDidLoad: new Signal,

  endWasReached: new Signal,

  init: function(n) {
    var problems = [];
    for (var i = 0; i < n; i++) {
      problems.push(Problem.random(12));
    }
    this.problems = problems;
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

    this.next();
  }

};

var Card = React.createClass({
  componentWillMount: function() {
    var self = this;

    Model.nextDidLoad.tap(function(model, problem) {
      self.setState({
        face: problem,
        rear: problem
      });
      
      var af = self.refs.af.getDOMNode(),
          ar = self.refs.ar.getDOMNode();
      af.value = ar.value = '';
      af.focus();
    });

    window.addEventListener('resize', function() {
      self.windowDidResize(event);
    }, false);

  },

  componentDidMount: function() {
    this.windowDidResize();
  },

  getInitialState: function() {
    return {
      face: Problem.emtpy(),
      rear: Problem.emtpy()
    }
  },

  windowDidResize: function() {
    var el = this.getDOMNode(),
        rect = el.getBoundingClientRect(),
        ww = window.innerWidth,
        wh = window.innerHeight;

    console.log(wh, rect.height);
    el.style.setProperty('top', (wh/2 - rect.height/2) + 'px', '');
    el.style.setProperty('left', (ww/2 - rect.width/2) + 'px', '');
  },

  inputDidBlur: function(event) {
    // this.refs.ans.getDOMNode().focus();
  },

  inputHasKeyDown: function(event) {
    switch (event.keyCode) {
    case 13: // enter
      Model.check(parseInt(this.refs.af.getDOMNode().value));
      break;
    case 27: // esc
      this.refs.af.getDOMNode().value = '';
      this.refs.ar.getDOMNode().value = '';
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
      </div>
    );
  }
});

React.renderComponent(
  <Card/>,
  document.getElementById('root')
);

Model.init(5);

Model.endWasReached.tap(function(model) {
  console.log('end', model);
});
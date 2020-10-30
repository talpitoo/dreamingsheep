(function () {
    'use strict';

    angular
        .module('app')
        .controller('StatsController', StatsController);

    StatsController.$inject = ['$location', 'AuthenticationService', 'FlashService'];
    function StatsController($location, AuthenticationService, FlashService) {
        var vm = this;

        vm.isActive = function (viewLocation) {
          return viewLocation === $location.path();
        };

        // search
        vm.searchInput = "";
        vm.submitSearch = function(searchObject) {
          $location.path("/search");
        };

        // dreams per day chart
        vm.chartDreamsPerDay = {};
        vm.chartDreamsPerDay.type = "ColumnChart";
        vm.chartDreamsPerDay.data = {
          "cols": [
            {type: "number"},
            {type: "number"}
          ],
          "rows": [
            {c: [
                {v: 0},
                {v: 2},
            ]},
            {c: [
                {v: 1},
                {v: 7}
            ]},
            {c: [
                {v: 2},
                {v: 2},
            ]},
            {c: [
                {v: 3},
                {v: 3},
            ]},
            {c: [
                {v: 4},
                {v: 10},
            ]},
            {c: [
                {v: 5},
                {v: 9},
            ]},
            {c: [
                {v: 6},
                {v: 5},
            ]}
        ]};
        vm.chartDreamsPerDay.options = {
          //bar: { groupWidth: "90%" },
          legend: 'none',
          hAxis: {
            baselineColor: 'transparent',
            gridlineColor: 'transparent',
            textPosition: 'none'
          },
          vAxis: {
            baselineColor: 'transparent',
            gridlineColor: 'transparent',
            textPosition: 'none'
          }
        };

        // mood chart
        vm.chartMood = {};
        vm.chartMood.type = "LineChart";
        vm.chartMood.data = {
          "cols": [
            {type: "number"},
            {type: "number"}
          ],
          "rows": [
            {c: [
                {v: 0},
                {v: 8},
            ]},
            {c: [
                {v: 1},
                {v: 7}
            ]},
            {c: [
                {v: 2},
                {v: 9},
            ]},
            {c: [
                {v: 3},
                {v: 3},
            ]},
            {c: [
                {v: 4},
                {v: 10},
            ]},
            {c: [
                {v: 5},
                {v: 9},
            ]},
            {c: [
                {v: 6},
                {v: 6},
            ]}
        ]};
        vm.chartMood.options = {
          curveType: 'function',
          colors: ['#c70039'],
          legend: 'none',
          hAxis: {
            baselineColor: '#fff',
            gridlineColor: '#fff',
            textPosition: 'none'
          },
          vAxis: {
            baselineColor: '#fff',
            gridlineColor: '#fff',
            textPosition: 'none'
          }
        };

        // sleep chart
        vm.chartSleep = {};
        vm.chartSleep.type = "BarChart";
        vm.chartSleep.data = {
          "cols": [
            {type: "string"},
            {type: "number"},
            {type: "string", role: "style"}
          ],
          "rows": [
            {c: [
                {v: 'Night'},
                {v: 7},
                {v: '#581845'}
            ]},
            {c: [
              {v: 'Evening'},
              {v: 1},
              {v: '#900c3f'}
            ]},
            {c: [
              {v: 'Afternoon'},
              {v: 1},
              {v: '#c70039'}
            ]},
            {c: [
              {v: 'Morning'},
              {v: 2},
              {v: '#ff5733'}
            ]}
        ]};
        vm.chartSleep.options = {
          // bar: { groupWidth: "80%" },
          legend: 'none',
          hAxis: {
            baselineColor: '#fff',
            gridlineColor: '#fff',
            textPosition: 'none'
          },
          vAxis: {
            baselineColor: '#fff',
            gridlineColor: '#fff'
            //textPosition: 'none'
          }
        };

        // type chart
        vm.chartType = {};
        vm.chartType.type = "PieChart";
        vm.chartType.data = {
          "cols": [
            {type: "string"},
            {type: "number"}
          ],
          "rows": [
            {c: [
                {v: 'lucid'},
                {v: 3},
            ]},
            {c: [
                {v: 'regular'},
                {v: 14}
            ]},
            {c: [
                {v: 'sleep paralysis'},
                {v: 2},
            ]},
            // {c: [
            //     {v: 'precognition'},
            //     {v: 1},
            // ]},
            // {c: [
            //     {v: 'false awakening'},
            //     {v: 1},
            // ]},
            // {c: [
            //     {v: 'recurring'},
            //     {v: 2},
            // ]},
            // {c: [
            //     {v: 'multi-dimensional'},
            //     {v: 2},
            // ]},
            {c: [
                {v: 'meditation/daydream'},
                {v: 6},
            ]},
            {c: [
                {v: 'psychedelic'},
                {v: 4},
            ]}
        ]};
        vm.chartType.options = {
          //pieSliceText: 'label',
          pieSliceText: 'none',
          //pieStartAngle: 60,
          //sliceVisibilityThreshold: .05,
          // colors:['#AA3939','#801515', '#AA6C39', '#804515', '#226666', '#0D4D4D', '#2D882D', '#116611'],
          colors: ['#9400d3', '#4b0082', '#0000ff', '#ff7f00', '#c70039'],
          slices: {
            0: {offset: 0.2}
          }
        };

        // recall chart
        vm.chartRecall = {};
        vm.chartRecall.type = "LineChart";
        vm.chartRecall.data = {
          "cols": [
            {type: "number"},
            {type: "number"}
          ],
          "rows": [
            {c: [
                {v: 0},
                {v: 3},
            ]},
            {c: [
                {v: 1},
                {v: 10}
            ]},
            {c: [
                {v: 2},
                {v: 23},
            ]},
            {c: [
                {v: 3},
                {v: 10},
            ]},
            {c: [
                {v: 4},
                {v: 18},
            ]},
            {c: [
                {v: 5},
                {v: 9},
            ]},
            {c: [
                {v: 6},
                {v: 13},
            ]}
        ]};
        vm.chartRecall.options = {
            legend: 'none',
            hAxis: {
              baselineColor: '#fff',
              gridlineColor: '#fff',
              textPosition: 'none'
            },
            vAxis: {
              baselineColor: '#fff',
              gridlineColor: '#fff',
              textPosition: 'none'
            }
        };

        // ================================ d3
        var json = {
          'name': 'symbols',
          'children': [{
            'name': 'Levitation',
            'size': 7
          }, {
            'name': 'Cycling',
            'size': 5
          }, {
            'name': 'Flying',
            'size': 4
          }, {
            'name': 'Dog',
            'size': 1
          }, {
            'name': 'Mind',
            'size': 1
          }, {
            'name': 'Water',
            'size': 2
          }, {
            'name': 'Friend',
            'size': 1
          }, {
            'name': 'Conversation',
            'size': 5
          }, {
            'name': 'OA',
            'size': 1
          }]
        };


        // var $window = $windowProvider.$get();
        // var d3 = $window.d3;

        var r = 200,
            format = d3.format(',d'),
            bubble = d3.layout.pack()
              .sort(null)
              .size([r, r])
              .padding(1.5);
        var vis = d3.select('#chart_div_symbol').append('svg')
            .attr('width', r)
            .attr('height', r);

          // Returns a flattened hierarchy containing all leaf nodes under the root.
          function classes(root) {

            var classes = [];

            function recurse(name, node) {
              if (node.children) {
                node.children.forEach(function(child) {
                  recurse(node.name, child);
                });
              }
              else {
                classes.push({
                  packageName: name,
                  className: node.name,
                  value: node.size
                });
              }
            }

            recurse(null, root);
            return {
              children: classes
            };
          }

        var node = vis.selectAll('g.node')
          .data(bubble.nodes(classes(json))
            .filter(function(d) {
              return !d.children;
            }))
          .enter().append('g')
          .attr('class', 'node')
          .attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
          });

        node.append('title')
          .text(function(d) {
            return d.className + ': ' + format(d.value);
          });

        node.append('circle')
          .attr('r', function(d) {
            return d.r;
          })
          .style('fill', function(d) {
            return 'hsl(' + (d.r + 365) + ',100%,50%)';
          });


        node.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '.3em')
          .attr('font-family', 'Arial')
          .attr('font-size', '11')
          .text(function(d) {
            return d.className.substring(0, d.r / 3);
          });

        (function initController() {
          //
        })();
    }

})();

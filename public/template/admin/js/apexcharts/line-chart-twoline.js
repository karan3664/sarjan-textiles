(function ($) {
  
    var tfLineChart = (function () {
  
      var chartBar = function () {
      
        var options = {
            series: [{
            name: 'Item 01',
            data: [31, 90, 58, 70, 92, 89, 80, 60, 30, 59, 23, 35]
          }, {
            name: 'Item 02',
            data: [51, 45, 25, 51, 34, 20, 41, 28, 64, 89, 46, 94]
          },
          ],
            chart: {
            height: 407,
            type: 'line',
            stacked: true,
            toolbar: {
              show: false,
            },
            animations: {
              enabled: true,
              easing: 'easeinout',
              speed: 10,
              animateGradually: {
                  enabled: true,
                  delay: 10
              },
              dynamicAnimation: {
                  enabled: true,
                  speed: 10
              }
            } 
          },
         
          legend: {
            show: false,
          },
          colors: ['#E43131', '#F0A750'],
          stroke: {
            curve: 'smooth',
            width: 3,
          },
          yaxis: {
            labels: {
              style: {
                colors: '#181818',
              },
            },
          },
          xaxis: {
            labels: {
              style: {
                colors: '#181818',
              },
            },
            categories: [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ]
          },
          tooltip: {
            show: false,
          },
        };
  
        chart = new ApexCharts(
          document.querySelector("#line-chart-twoline"),
          options
        );
        if ($("#line-chart-twoline").length > 0) {
          chart.render();
        }
      };
  
      /* Function ============ */
      return {
        init: function () {},
  
        load: function () {
          chartBar();
        },
        resize: function () {},
      };
    })();
  
    jQuery(document).ready(function () {});
  
    jQuery(window).on("load", function () {
      tfLineChart.load();
    });
  
    jQuery(window).on("resize", function () {});
  })(jQuery);
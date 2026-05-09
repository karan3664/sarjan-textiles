(function ($) {
    
    var tfLineChart = (function () {
  
      var chartBar = function () {
      
        var options = {
          chart: {
            height: 450,
            type: "area",
            zoom: {
              enabled: false
            },
            toolbar: {
              show: false,
            },
            animations: {
              enabled: true,
              easing: 'easeinout',
              speed: 100,
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
          dataLabels: {
            enabled: false
          },
          colors: ["#E43131"],
          series: [
            {
              name: "Views",
              data: [45, 52, 38, 45, 49, 43, 40 ,45, 52, 38, 45, 19]
            }
          ],
          fill: {
            type: "gradient",
            gradient: {
              shadeIntensity: 1,
              opacityFrom: 0.3,
              opacityTo: 0.9,
              stops: [0, 90, 100]
            }
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
            x: { show: !1 },
          },
          responsive: [
            {
              breakpoint: 550,
              options: {
                chart: {
                  height: 300
                }
              }
            }
          ]
        };

        chart = new ApexCharts(
          document.querySelector("#line-chart-1"),
          options
        );
        if ($("#line-chart-1").length > 0) {
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
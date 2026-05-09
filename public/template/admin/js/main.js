/**
  * selectImages
  * menuleft
  * tabs
  * collapse_menu
  * showpass
  * select_colors_theme
  * icon_function
  * fullcheckbox
  * counter
  * uploadfile
  * multiselect
  * datePicker
  * message
  * like
  * preloader
*/

; (function ($) {

  "use strict";

  var selectImages = function () {
    if ($(".image-select").length > 0) {
      const selectIMG = $(".image-select");
      selectIMG.find("option").each((idx, elem) => {
        const selectOption = $(elem);
        const imgURL = selectOption.attr("data-thumbnail");
        if (imgURL) {
          selectOption.attr(
            "data-content",
            "<img src='%i'/> %s"
              .replace(/%i/, imgURL)
              .replace(/%s/, selectOption.text())
          );
        }
      });
      selectIMG.selectpicker();
    }
  };

  var menuleft = function () {
    if ($(".section-menu-left").length) {
      var bt = $(".section-menu-left").find(".has-children");
      bt.on("click", function () {
        var args = { duration: 200 };
        if ($(this).hasClass("active")) {
          $(this).children(".sub-menu").slideUp(args);
          $(this).removeClass("active");
        } else {
          $(".sub-menu").slideUp(args);
          $(this).children(".sub-menu").slideDown(args);
          $(".menu-item.has-children").removeClass("active");
          $(this).addClass("active");
        }
      });
      $('.sub-menu-item').on('click', function(event){
        event.stopPropagation();
      });
    }
  };

  var tabs = function(){
    $('.widget-tabs').each(function(){
        $(this).find('.widget-content-tab').children().hide();
        $(this).find('.widget-content-tab').children(".active").show();
        $(this).find('.widget-menu-tab').find('li').on('click',function(){
            var liActive = $(this).index();
            var contentActive=$(this).siblings().removeClass('active').parents('.widget-tabs').find('.widget-content-tab').children().eq(liActive);
            contentActive.addClass('active').fadeIn("slow");
            contentActive.siblings().removeClass('active');
            $(this).addClass('active').parents('.widget-tabs').find('.widget-content-tab').children().eq(liActive).siblings().hide();
        });
    });
  };

  $('ul.dropdown-menu.has-content').on('click', function(event){
    event.stopPropagation();
  });
  $('.button-close-dropdown').on('click', function(){
    $(this).closest('.dropdown').find('.dropdown-toggle').removeClass('show');
    $(this).closest('.dropdown').find('.dropdown-menu').removeClass('show');
  });

  var collapse_menu = function () {
    $(".button-show-hide,.menu-backdrop").on("click", function () {
      $('.layout-wrap').toggleClass('full-width');
    })
  }

  var showpass = function() {
    $(".show-pass").on("click", function () {
      $(this).toggleClass("active");
      var input = $(this).parents(".password").find(".password-input");

      if (input.attr("type") === "password") {
        input.attr("type", "text");
      } else if (input.attr("type") === "text") {
        input.attr("type", "password");
      }
    });
  }

  var select_colors_theme = function () {
    if ($(".select-colors-theme").length) {
      $(".select-colors-theme .item").on("click", function (e) {
        $(this).parents(".select-colors-theme").find(".active").removeClass("active");
        $(this).toggleClass("active");
      })
    }
  }

  var icon_function = function () {
    if ($(".list-item-function").length) {
      $(".list-item-function .btns-trash").on("click", function (e) {
        $(this).parents(".item-row").remove();
      })
    }
  }

  var preloader = function () {
    setTimeout(function () {
    $("#preload").fadeOut("slow", function () {
        $(this).remove();
    });
    }, 200);
  };

  var fullcheckbox = function () {
    $('.total-checkbox').on('click', function () {
      if ( $(this).is(':checked') ) {
        $(this).closest('.wrap-checkbox').find('.tf-table-item').addClass("checked");
        $(this).closest('.wrap-checkbox').find('.checkbox-item').prop('checked', true);
      } else {
        $(this).closest('.wrap-checkbox').find('.tf-table-item').removeClass("checked");
        $(this).closest('.wrap-checkbox').find('.checkbox-item').prop('checked', false);
      }
    });

    $('.tf-table-item .checkbox-item').on('click', function () {
      $(this).closest('.tf-table-item').toggleClass("checked");
    });
  };

  var counter = function () {
    if ($(document.body).hasClass("counter-scroll")) {
      var a = 0;
      var oTop = $(".counter").offset().top - window.innerHeight;

      if (a == 0 && oTop < 500) {
        if ($().countTo) {
          $(".counter")
            .find(".number")
            .each(function () {
              var to = $(this).data("to"),
                speed = $(this).data("speed");
              $(this).countTo({
                to: to,
                speed: speed,
              });
            });
        }
        a = 1;
      }
      $(window).scroll(function () {
        if (a == 0 && $(window).scrollTop() > oTop) {
          if ($().countTo) {
            $(".counter")
              .find(".number")
              .each(function () {
                var to = $(this).data("to"),
                  speed = $(this).data("speed");
                $(this).countTo({
                  to: to,
                  speed: speed,
                });
              });
          }
          a = 1;
        }
      });
    }
  };

  var uploadfile = function () {
    if ($("#myFile").length) {
      document
        .getElementById("myFile")
        .addEventListener("change", function (event) {
          var file = event.target.files[0];
          var reader = new FileReader();

          reader.onload = function (e) {
            var imgElement = document.getElementById("myFile-input");
            imgElement.src = e.target.result;
            imgElement.classList.add("has-img");
          };

          if (file) {
            reader.readAsDataURL(file);
          }
        });
    }
    if ($("#myFile-2").length) {
      document
        .getElementById("myFile-2")
        .addEventListener("change", function (event) {
          var file = event.target.files[0];
          var reader = new FileReader();

          reader.onload = function (e) {
            var imgElement = document.getElementById("myFile-input-2");
            imgElement.src = e.target.result;
            imgElement.classList.add("has-img");
          };

          if (file) {
            reader.readAsDataURL(file);
          }
        });
    }
    
    let lastFileName = "No file choose";
    $('.myFile').on('change', function () {
      const file = this.files[0];
      if (file) {
        lastFileName = file.name;
      }
      $(this).siblings('.file-name').text(lastFileName);
    });

    $(".item-input-clear .clear").on("click", function () {
      $(this).siblings("input").val("");
    });
    
  };

  var multiselect = function () {

    document.querySelectorAll(".multi-select").forEach(ms => {
      const selectedTagsContainer = ms.querySelector(".selected-tags");
      const dropdownList = ms.querySelector(".list-dropdown");
      const dropdownToggle = ms.querySelector(".toggle-dropdown");
    
      let selected = [];
      try {
        selected = JSON.parse(ms.dataset.default || "[]");
      } catch (e) {
        selected = [];
      }
    
      function renderTags() {
        selectedTagsContainer.innerHTML = "";
        selected.forEach(color => {
          const tag = document.createElement("div");
          tag.className = "tag";
          tag.innerHTML = `<span class="icon icon-close"></span>${color}`;
          tag.querySelector("span").onclick = (e) => {
            e.stopPropagation();
            selected = selected.filter(c => c !== color);
            renderTags();
          };
          selectedTagsContainer.appendChild(tag);
        });
      }
    
      dropdownToggle.onclick = () => {
        dropdownList.style.display = dropdownList.style.display === "flex" ? "none" : "flex";
      };
    
      dropdownList.querySelectorAll("div").forEach(option => {
        option.onclick = () => {
          const color = option.textContent.trim();
          if (!selected.includes(color)) {
            selected.push(color);
            renderTags();
          }
          dropdownList.style.display = "none";
        };
      });
    
      renderTags();
    });

  }

  var datePicker = function () {

    if ($(".datePicker").length) {
      flatpickr(".datePicker", {
        altInput: true,
        altFormat: "M d, Y",
        dateFormat: "Y-m-d",
        defaultDate: document.getElementsByClassName("datePicker").value
      });
    }

  }

  var message = function () {
    if ($(".wg-message").length) {
      
      let friends = {
        list: $('ul.people'),
        all: $('.left .person'),
        name: '',
        img: ''
      };
      
      let chat = {
        container: $('.wg-message .right'),
        current: null,
        person: null,
        name: $('.wg-message .right .top .name'),
        img: $('.wg-message .right .top .images')
      };
      
      friends.all.on('mousedown', function () {
        if (!$(this).hasClass('active')) {
          setActiveChat($(this));
        }
      });
      
      function setActiveChat($f) {
        friends.list.find('.active').removeClass('active');
        $f.addClass('active');
      
        chat.current = chat.container.find('.active-chat');
        chat.person = $f.data('chat');
      
        chat.current.removeClass('active-chat');
        chat.container.find('[data-chat="' + chat.person + '"]').addClass('active-chat');
      
        friends.name = $f.find('.name').text();
        chat.name.text(friends.name);
      
        friends.img = $f.find('.images').html();
        chat.img.html(friends.img);
      }

      function message_delete() {
        $('.message-bubble-delete').on('click', function () {
          $(this).closest(".message-bubble-item").remove();
        });
      }
      
      function newMessage() {
        let message = $(".write input").val();
        if ($.trim(message) === '') return false;
      
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      
        const $msg = $(
          `
          <div class="message-bubble-item">
            <div class="bubble me">
              ${message}
              <div class="dropdown default">
                <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  <span class="icon-more"></span>
                </button>
                <ul class="dropdown-menu">
                  <li>  
                    <a class="message-bubble-edit text-button" href="javascript:void(0);">Edit</a>
                  </li>
                  <li>  
                    <a class="message-bubble-delete text-button" href="javascript:void(0);">Delete</a>
                  </li>
                </ul>
              </div>
            </div>
            <div class="history-time me">${time}</div>
          </div>
          `
        );
      
        $('.right .active-chat').append($msg);
        $('.right .active-chat').scrollTop($('.right .active-chat')[0].scrollHeight);
      
        $('.write input').val('');
        message_delete();

      }
      
      $('.message-send').on('click', function () {
        newMessage();
      });
      
      $(window).on('keydown', function (e) {
        if (e.which === 13) {
          newMessage();
          return false;
        }
      });

      message_delete();

      $('.delete-user-message').on('click', function () {

        if ($('.left .person.active').next().length) {
          var images = $('.left .person.active').next().find('.images').html();
          var name = $('.left .person.active').next().find('.name').html();
  
          $('.wg-message .right .top .images').html(images);
          $('.wg-message .right .top .name').html(name);
  
          $('.right .chat.active-chat').next().addClass("active-chat").prev().remove();
          $('.left .person.active').next().addClass("active").prev().remove();
        } else {
          var images = $('.left .person.active').prev().find('.images').html();
          var name = $('.left .person.active').prev().find('.name').html();
  
          $('.wg-message .right .top .images').html(images);
          $('.wg-message .right .top .name').html(name);
  
          $('.right .chat.active-chat').prev().addClass("active-chat").next().remove();
          $('.left .person.active').prev().addClass("active").next().remove();
        }

      });
      
    }

    if (matchMedia("only screen and (max-width: 767px)").matches) {
      if ($(".wg-message").length) {
        $(".left .person").on('click', function () {
          $(this).parents(".wg-message").addClass("open-chat");
        })
        $(".back-list-person").on('click', function () {
          $(this).parents(".wg-message").removeClass("open-chat");
        })
      }
    }
  }

  var like = function() {
    $(".like-icon").on("click", function () {
      $(this).parents(".wishlist-wrap").toggleClass("liked");
    });
  }

  // Dom Ready
  $(function () {

    selectImages();
    menuleft();
    tabs();
    collapse_menu();
    showpass();
    select_colors_theme();
    icon_function();
    fullcheckbox();
    counter();
    uploadfile();
    multiselect();
    datePicker();
    message();
    like();
    preloader();
    
  });

})(jQuery);

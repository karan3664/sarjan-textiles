
$(document).ready(function () {
    if($(".textarea-tinymce").length > 0){
        tinymce.init({
            selector: ".textarea-tinymce",
            theme: "modern",
            height: 200,
            plugins: [
                "advlist autolink link image lists charmap print preview hr anchor pagebreak spellchecker",
                "searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking",
                "save table contextmenu directionality emoticons template paste textcolor"
            ],
            toolbar: "insertfile styleselect | bold italic | bullist numlist | link image | print preview media fullpage",
            style_formats: [
                {title: 'Bold text', inline: 'b'},
                {title: 'Red text', inline: 'span', styles: {color: '#ff0000'}},
                {title: 'Red header', block: 'h1', styles: {color: '#ff0000'}},
                {title: 'Example 1', inline: 'span', classes: 'example1'},
                {title: 'Example 2', inline: 'span', classes: 'example2'},
                {title: 'Table styles'},
                {title: 'Table row 1', selector: 'tr', classes: 'tablerow1'}
            ],
            content_css: [
                'https://fonts.googleapis.com/css2?family=Kumbh+Sans:wght@100..900&display=swap',
              ]
        });
    }
});


  
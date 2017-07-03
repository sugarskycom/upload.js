$(function(){
    var Md5File = (function(){
        return function(file, cbk) {
            //建了一个新的 worker 线程
            var worker = new Worker( '../static/filelist/js/getmd5.js' );
            //接收 worker线程返回值函数
            worker.onmessage = function( e ) {
                //接收worker线程返回值
                var v = e.data;
                cbk( v, file );
                //终止 worker
                worker.terminate();
            };
            //向worker线程传参
            // worker.postMessage(file);
            worker.postMessage(file.source.source);
        }
    })();
    var uploader = WebUploader.create({
        auto: true, // 选完文件后，是否自动上传
       // dnd:'#auto_load',
        paste:'document.body',
        swf: 'Uploader.swf', // swf文件路径
        server: 'file/uploadifive', // 文件接收服务端
        pick: '#file_upload', // 选择文件的按钮。可选
        // chunked: true,
        // chunkSize:10240,
        formData:{
            dirhiddenpath:$('#dirhidden').text(),
            dirhiddenid:$('#dirhidden').attr('valueid'),
        },
    });
    //拖拽上传============开始=============================
    var ipt = document.getElementById('auto_load');
    ipt.ondragover = function () { return false; };
    $('body').ondragenter = function () {$('#autod_load').show(); return false; };
    $('body').ondragleave = function () {$('#autod_load').hide(); return false; };
    ipt.ondrop = function(e) {
        e.stopPropagation();
        e.preventDefault();
        e = e || window.event;
        var dataTransfer = e.dataTransfer;
        var items = dataTransfer.items;
        var files = e.dataTransfer.files;
        var canAccessFolder = !!(items && items[ 0 ].webkitGetAsEntry);
        for ( var i = 0, len = files.length; i < len; i++ ) {
            var file = files[ i ];
            var item = items && items[ i ];

            if ( canAccessFolder && item.webkitGetAsEntry().isDirectory ) {
                traverseDirectoryTree(dataTransfer.items[0].webkitGetAsEntry(),$('#dirhidden').text(),$('#dirhidden').attr('valueid'));
            } else {
                uploader.options.formData.dirhiddenpath = $('#dirhidden').text();
                uploader.options.formData.dirhiddenid = $('#dirhidden').attr('valueid');
                uploader.addFiles(file);
            }
        }
    };
    function traverseDirectoryTree( entry ,dirhiddenpath,dirhiddenid) {
        if ( entry.isFile ) {
            entry.file(function( file ) {
                var tmp = uploader;
                uploader = WebUploader.create({
                    auto: true, // 选完文件后，是否自动上传
                    paste:'document.body',
                    swf: 'Uploader.swf', // swf文件路径
                    server: 'file/uploadifive', // 文件接收服务端
                    pick: '#file_upload', // 选择文件的按钮。可选
                    formData:{
                        dirhiddenpath:dirhiddenpath,
                        dirhiddenid:dirhiddenid,
                    },
                });
                uploader.on( 'fileQueued', function( file ) {
                    $('#myModa19').modal('show');
                    Md5File( file, function( value ) {
                        file.md5 = value;
                        dirhiddenpath = $('#dirhidden').text();
                        dirhiddenid = $('#dirhidden').attr('valueid');
                        //判断文件是否存在
                        $.ajax({
                            url: 'file/check_same_file',
                            type: 'POST',
                            dataType: 'json',
                            // async: false,
                            //data: {filename: file.name,filemd5:value},
                            data: {filemd5:value},
                            success:function(res){
                                var percent =  parseInt($('#'+file.id+'').text());
                                //文件存在则启动秒传
                                if(res > 1){
                                    //获取当前文件上传进度 没有上传完成则取消上传 改为秒传
                                    if(uploader.isInProgress(file) && (percent != 100)){
                                        uploader.skipFile( file );
                                        $('#'+file.id+'123').find('.file_status').text('正在秒传');
                                        $.ajax({
                                            url: 'file/md5_file',
                                            type: 'POST',
                                            dataType: 'json',
                                            //data: {filename: file.name,filemd5:value,dirhiddenpath:dirhiddenpath,dirhiddenid:dirhiddenid},
                                            data: {filename: file.name,file_id:res,dirhiddenpath:dirhiddenpath,dirhiddenid:dirhiddenid},
                                            success:function(data){
                                                if(data == 1){
                                                    // alert('文件秒传成功');
                                                    var $li = $('#'+file.id+'123').find('.file_jindu');
                                                    $per = $li.find('.'+file.id+'');
                                                    if($per.length == 0){
                                                        $per = $('<div class="progress-bar '+file.id+'" id="'+file.id+'">100%</div></div>').appendTo( $li );
                                                    }
                                                    $per.css( 'width', '100%' );
                                                    $('#'+file.id+'').text('100%');
                                                    $('#'+file.id+'123').find('.file_status').text('秒传成功');
                                                }else{
                                                    // alert('文件秒传失败,文件重新上传');
                                                    $('#'+file.id+'123').remove();
                                                    uploader.retry(file);//文件重新上传
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    });
                });
                uploader.on('uploadStart',function( file ) {
                    $('<div id="'+file.id+'123" class="list_item" fileid=""><div style="line-height: 45px;width:25%;float:left;" class="file_name"><img src="../static/file/img/bg.png" width="24px" alt="" style="vertical-align: middle;"/><span>'+file.name+'</span></div><div style="line-height: 45px;width:30%;float:left;text-align: center;" class="file_jindu"></div><div style="line-height:45px;width:15%;float:left;text-align: center;" class="file_size">'+(file.size/1024).toFixed(2)+'kb</div><div style="line-height: 45px;width:20%;float:left;" class="file_status">上传中</div><div style="line-height: 45px;width:10%;float:left;" class="file-level"><a href="#"> 未设置</a> </div></div>').appendTo($('#myModa19').find('.up_body'));
                });
                // 文件上传过程中创建进度条实时显示。
                uploader.on( 'uploadProgress', function( file, percentage ) {
                    var $li = $('#'+file.id+'123').find('.file_jindu');
                    $per = $li.find('.'+file.id+'');
                    if($per.length == 0){
                        $per = $('<div class="progress-bar '+file.id+'" ><div class="progress-value" id="'+file.id+'">100%</div></div>').appendTo( $li );
                    }
                    $per.show();
                    $per.css( 'width', percentage * 100 + '%' );
                    $('#'+file.id+'').text(parseInt(percentage * 100) + '%');
                });
                uploader.on( 'uploadSuccess', function( file, res ) {
                    if(res.error == 0){
                        $('#'+file.id+'123').find('.file_status').text('上传成功');
                        $('#'+file.id+'123').attr('fileid',res.fileid);
                    }else{
                        var errinfo = res.message;
                        $('#'+file.id+'123').find('.file_status').text(errinfo);
                        var $li = $('#'+file.id+'123').find('.file_jindu');
                        $per = $li.find('.'+file.id+'');
                        $per.css( 'width', '0%' );
                        $('#'+file.id+'').text('0%');
                    }
                });
                // 文件上传失败，显示上传出错。
                uploader.on( 'uploadError', function( file ) {
                    $('#'+file.id+'123').find('.file_status').text('上传失败');
                });
                uploader.addFiles(file);
                uploader = tmp;
            });
        } else if ( entry.isDirectory ) {
            var upres = upDirectory(entry.name,dirhiddenpath,dirhiddenid);
            entry.createReader().readEntries(function( entries ) {
                for ( var i = 0; i < entries.length; i++ ) {
                    traverseDirectoryTree( entries[ i ] ,upres.dirhiddenpath,upres.dirhiddenid);
                }
            });
        }
    }
    function upDirectory(dname,dirhiddenpath,dirhiddenid){
        var nowpath = '';
        var nowid = 0;
        $.ajax({
            url: 'file/makedir',
            type: 'POST',
            dataType: 'json',
            async : false,
            data: {dirname: dname,dirhiddenpath:dirhiddenpath,dirhiddenid:dirhiddenid},
            success:function(data){
                nowpath = data.nowpath;
                nowid = data.nowid;
                $('<div id="'+data.nowid+'123" class="list_item" fileid=""><div style="line-height: 45px;width:25%;float:left;" class="file_name"><img src="../static/file/img/bg.png" width="24px" alt="" style="vertical-align: middle;"/><span>'+dname+'</span></div><div style="line-height: 45px;width:30%;float:left;text-align: center;" class="file_jindu"><div class="progress-bar " style="width: 100%;"><div class="progress-value">100%</div></div></div><div style="line-height:45px;width:15%;float:left;text-align: center;" class="file_size">文件夹</div><div style="line-height: 45px;width:20%;float:left;" class="file_status">上传成功</div><div style="line-height: 45px;width:10%;float:left;"><a href="#"> 无</a> </div></div>').appendTo($('#myModa19').find('.up_body'));
            },
            error:function(){
                alert('创建失败');
            }
        });
        //后台创建文件夹,返回新创建的文件夹路径和id
        return {dirhiddenpath:nowpath,dirhiddenid:nowid};
    }
    //拖拽上传结束===========================================
    uploader.on( 'fileQueued', function( file ) {
        $('#myModa19').modal('show');
        Md5File( file, function( value ) {
            file.md5 = value;
            dirhiddenpath = $('#dirhidden').text();
            dirhiddenid = $('#dirhidden').attr('valueid');
            //判断文件是否存在
            $.ajax({
                url: 'file/check_same_file',
                type: 'POST',
                dataType: 'json',
                // async: false,
                //data: {filename: file.name,filemd5:value},
                data: {filemd5:value},
                success:function(res){
                    var percent =  parseInt($('#'+file.id+'').text());
                    //文件存在则启动秒传
                    if(res > 1){
                        //获取当前文件上传进度 没有上传完成则取消上传 改为秒传
                        if(uploader.isInProgress(file) && (percent != 100)){
                            uploader.skipFile( file );
                            $('#'+file.id+'123').find('.file_status').text('正在秒传');
                            $.ajax({
                                url: 'file/md5_file',
                                type: 'POST',
                                dataType: 'json',
                                //data: {filename: file.name,filemd5:value,dirhiddenpath:dirhiddenpath,dirhiddenid:dirhiddenid},
                                data: {filename: file.name,file_id:res,dirhiddenpath:dirhiddenpath,dirhiddenid:dirhiddenid},
                                success:function(data){
                                    if(data == 1){
                                        // alert('文件秒传成功');
                                        var $li = $('#'+file.id+'123').find('.file_jindu');
                                        $per = $li.find('.'+file.id+'');
                                        if($per.length == 0){
                                            $per = $('<div class="progress-bar '+file.id+'" id="'+file.id+'">100%</div></div>').appendTo( $li );
                                        }
                                        $per.css( 'width', '100%' );
                                        $('#'+file.id+'').text('100%');
                                        $('#'+file.id+'123').find('.file_status').text('秒传成功');
                                    }else{
                                        // alert('文件秒传失败,文件重新上传');
                                        $('#'+file.id+'123').remove();
                                        uploader.retry(file);//文件重新上传
                                    }
                                }
                            });
                        }
                    }
                }
            });
        });
    });
    uploader.on('uploadStart',function( file ) {
        $('<div id="'+file.id+'123" class="list_item" fileid=""><div style="line-height: 45px;width:25%;float:left;" class="file_name"><img src="../static/file/img/bg.png" width="24px" alt="" style="vertical-align: middle;"/><span>'+file.name+'</span></div><div style="line-height: 45px;width:30%;float:left;text-align: center;" class="file_jindu"></div><div style="line-height:45px;width:15%;float:left;text-align: center;" class="file_size">'+(file.size/1024).toFixed(2)+'kb</div><div style="line-height: 45px;width:20%;float:left;" class="file_status">上传中</div><div style="line-height: 45px;width:10%;float:left;" class="file-level"><a href="#"> 未设置</a> </div></div>').appendTo($('#myModa19').find('.up_body'));
    });
    // 文件上传过程中创建进度条实时显示。
    uploader.on( 'uploadProgress', function( file, percentage ) {
        var $li = $('#'+file.id+'123').find('.file_jindu');
        $per = $li.find('.'+file.id+'');
        if($per.length == 0){
            $per = $('<div class="progress-bar '+file.id+'" ><div class="progress-value" id="'+file.id+'">100%</div></div>').appendTo( $li );
        }
        $per.show();
        $per.css( 'width', percentage * 100 + '%' );
        $('#'+file.id+'').text(parseInt(percentage * 100) + '%');
    });
    uploader.on( 'uploadSuccess', function( file, res ) {
        if(res.error == 0){
            $('#'+file.id+'123').find('.file_status').text('上传成功');
            $('#'+file.id+'123').attr('fileid',res.fileid);
        }else{
            var errinfo = res.message;
            $('#'+file.id+'123').find('.file_status').text(errinfo);
            var $li = $('#'+file.id+'123').find('.file_jindu');
            $per = $li.find('.'+file.id+'');
            $per.css( 'width', '0%' );
            $('#'+file.id+'').text('0%');
        }
    });
    // 文件上传失败，显示上传出错。
    uploader.on( 'uploadError', function( file ) {
        $('#'+file.id+'123').find('.file_status').text('上传失败');
    });
    $('#uploadfile').click(function(event) {
        $('#uploadifive-files_upload').remove();
        $('#auto_load').attr('style', 'display:block;position:absolute;top:0;left:0;width:100%;height:15%;z-index:2001;');
        $('#uploadmenu').attr('style', 'left: 5px; top: 25px; display: block;');
        $('#maketxtname').attr('style', 'display:inline-block;');
        $('.txtform').attr('style', 'display:none;');
        $('#makedirname').attr('style', 'display:inline-block;');
        $('.filenameform').attr('style', 'display:none;');
        $('#addtxt').val('');
        $('#adddir').val('');
        // var time = $('#time').val();
        // var mdtime = $('#time').attr('mdtime');
        // var dirhiddenpath = $('#dirhidden').text();
        // var dirhiddenid = $('#dirhidden').attr('valueid');
    });
    $('#auto_load').on('click',function(){
        $(this).hide();
    });
    $('#auto_load').on('dragleave',function(){
        $(this).hide();
    });
    $('body').on('dragenter',function(){
        $('#auto_load').show();
        $('.myupload').remove();
    });
    $('.up_close').on('click', function(event) {
        $('#myupload').hide();
        location.reload();
    });
    $('.close').on('click', function(event) {
        // $('#myModa19').find('.up_body').text('');
        // $('#myModa19').hide();
        location.reload();
    });
    //上传进去弹出框 取消
    $('.concel_upload').on('click', function(event) {
        // $('#myModa19').find('.up_body').text('');
        // $('#myModa19').hide();
        location.reload();
    });
    //确定
    $('.yes_upload').on('click', function(event) {
        location.reload();
    });
    //点击页面任意位置,创建文件下拉菜单隐藏
    // $(document).click(function (e) {
    //     var drag = $("#uploadmenu"),
    //         dragel = $("#uploadfile")[0],
    //         target = e.target;
    //     if (dragel !== target && !$.contains(dragel, target)) {
    //         drag.hide();
    //     }
    // });
    //点击文件夹按钮,显示创建文件夹框
    $(".makedir").on('click', function(event) {
        $('#makedirname').attr('style', 'display:none;');
        $('.filenameform').attr('style', 'display:inline-block;');

        $('#maketxtname').attr('style', 'display:inline-block;');
        $('.txtform').attr('style', 'display:none;')
    });
    //点击文件，显示文本框
    $(".maketxt").on('click', function(event) {
        $('#maketxtname').attr('style', 'display:none;');
        $('.txtform').attr('style', 'display:inline-block;');

        $('#makedirname').attr('style', 'display:inline-block;');
        $('.filenameform').attr('style', 'display:none;');
    });

    $('#addtxt').keydown(function(event){
        if(event.keyCode==13){
            var dirhiddenpath = $('#dirhidden').text();
            var dirhiddenid = $('#dirhidden').attr('valueid');
            var txtname  = $('#addtxt').val()+".txt";
            if((txtname.indexOf(">")>=0)||(txtname.indexOf("<")>=0)||(txtname.indexOf("/")>=0)||(txtname.indexOf("\\")>=0)||(txtname.length>=3500)||(txtname.length<0)||(txtname.indexOf(" ")>=0)){
                alert('文件名中不能包含特殊字符!');
            }else{
                $.ajax({
                    url: 'file/maketxt',
                    type:'POST',
                    dataType: 'json',
                    data: {txtname: txtname,dirhiddenpath:dirhiddenpath,dirhiddenid:dirhiddenid},
                    success:function(data){
                        if(data == 1){
                            var str = '<div id="txt_remove"><div class="div_gray_text"></div> <div id="txt_content"><small class="filename" style="max-width: 909px; font-size:16px;">'+txtname+'</small><button id="editor_close" class="icon-close svg"></button> <textarea id="txt_reson"></textarea><input type="button" id="txt_true" value="保存"></div></div>';
                            $("body").append(str);
                            $("#txt_reson").focus();
                            $('#txt_true').on('click',function(){
                                var dirhiddenpath = $('#dirhidden').text();
                                var dirhiddenid = $('#dirhidden').attr('valueid');
                                var txtname  = $('#addtxt').val()+".txt";
                                var txt_reson  = $('#txt_reson').val();
                                $.post('file/write',{dirhiddenid:dirhiddenid,dirhiddenpath:dirhiddenpath,txt_reson:txt_reson,txtname:txtname},function(data){
                                    if(data == 2){
                                        alert('保存成功!');
                                        location.reload();
                                        $('#txt_remove').remove();
                                    }else{
                                        alert('保存失败!');
                                    }
                                });
                            })
                            //退出
                            $('#editor_close').on('click',function(){
                                //移除遮罩层
                                $('#txt_remove').remove();
                            })
                        }else if(data==3){
                            alert('文件已存在！');
                        }else if(data==4){
                            alert('请输入文件名！');
                        }else if(data==5){
                            alert('创建失败,当前文件没有可写权限')
                        }else{
                            alert('创建失败！');
                        }
                    }

                })
            }
        }
    });

    $('#adddir').keydown(function(event){
        if(event.keyCode==13){
            var dirhiddenpath = $('#dirhidden').text();
            var dirhiddenid = $('#dirhidden').attr('valueid');
            var dirname = $('#adddir').val();
            if((dirname.indexOf(">")>=0)||(dirname.indexOf("<")>=0)||(dirname.indexOf("/")>=0)||(dirname.indexOf("\\")>=0)||(dirname.length>=3500)||(dirname.length<=0)||(dirname.indexOf(" ")>=0)){
                alert('文件名中不能包含特殊字符且不能为空!');
            }else{
                $.ajax({
                    url: 'file/makedir',
                    type: 'POST',
                    dataType: 'json',
                    data: {dirname: dirname,dirhiddenpath:dirhiddenpath,dirhiddenid:dirhiddenid},
                    success:function(data){
                        if(data.result == 1){
                            alert('创建成功');
                            location.reload();
                        }else if(data.result == 3){
                            alert('创建失败,文件夹已经存在');
                        }else if(data.result == 4){
                            alert('创建失败,当前文件夹没有可写权限')
                        }else{
                            alert('创建失败');
                        }
                    },
                    error:function(){
                        alert('创建失败');
                    }
                })
            }
        }
    });
    $('.close2').on('click', function(event) {
        $('#dirform').attr('style', 'display:none;');
    });
})
window.onload = function(){
　　$('.webuploader-pick').siblings('div').css({
        opacity: '0'
    });
    $('.webuploader-element-invisible').css({
        width: '100px',
    });
}
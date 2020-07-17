$(function () {
    function checkPhoneFromSms() {

        $(document).on('submit', '.check-phone-popup-form', function (e) {
            e.preventDefault();
            var action = $(e.target).attr('action');
        })

        $(document).on('click', '.button-check-phone-sms', function (e) {
            e.preventDefault();
            var isCheckPhone = $(this).hasClass('check-phone');
            var isConfirmPhone = $(this).hasClass('confirm-phone');
            
            if (isCheckPhone) {
                var phoneField = $('.form-main [data-validator="phone"]');
                runSubmitValidate(phoneField);

                if (phoneField.parent('.status-success').length) {
                    requestSmsByPhone();
                }
            }
            if (isConfirmPhone) {
                sendSmsCodeToBackend();
            }
        })

        if (document.getElementById('sms')) {
            var smsCode = new IMask(
                document.getElementById('sms'), {
                mask: '000000'
            });
            smsCode.on('complete', function () {
                $('.button-check-phone-sms').removeClass('shake');
                setTimeout(function () {
                    $('.button-check-phone-sms').addClass('shake');
                }, 300)

            });
        }


        function requestSmsByPhone() {
            try {
                $('.button-check-phone-sms').attr('disabled', true)
                var tel = $('#phone-mask').val();
                var check = $('.f-send-sms-check').val();
                var telClear = tel.trim().replace(/[^\d]/g, '');
                var url = smsCheckRoute + telClear + '&typeCheck=' + check;
                var seconds = re_check_timeout / 1000;
                
                $('.resendSms span').remove();
                $('.resendSms').html('<span> Не приходит код? Повторить еще раз через <span class="sms-timeuot"></span> сек</span>');
                $('.sms-timeuot').text(seconds);
                var interval = setInterval(function(){
                    seconds--;
                    $('.sms-timeuot').text(seconds);
                    if(seconds == 0){
                        $('.f-send-sms-check').val('re_check');
                        $('.resendSms span').html('Не приходит код? <button class="button-check-phone-sms check-phone re-check-button">Повторить еще раз</button>')
                        clearInterval(interval);
                    }
                }, 1000);

                if (localStorage.getItem('sms_code_timestamp')) {
                    var last_sms_sended_time = Math.abs(+(localStorage.getItem('sms_code_timestamp')) - Date.now())
                    //check if user submited form more then 1 minutes ago
                    
                    if (last_sms_sended_time && last_sms_sended_time <= re_check_timeout) {
                        
                        // alert('Интервал на отправку смс - 1 минута');
                        $('.button-check-phone-sms').attr('disabled', false);
                        
                        return false;
                    }
                }

                if (window.questionnaire.recaptcha_response) {
                    url += '&recaptcha_response=' + window.questionnaire.recaptcha_response
                }
                $.ajax({
                    method: "POST",
                    url: url
                })
                    .done(function (md5) {
                        //get md5 string password
                        localStorage.removeItem('sms_code_md5');
                        localStorage.removeItem('sms_code_timestamp');
                        localStorage.setItem('sms_code_md5', md5);
                        localStorage.setItem('sms_code_timestamp', Date.now());
                        $('.button-check-phone-sms').attr('disabled', false);
                        $('.button-check-phone-sms').removeClass('check-phone').addClass('confirm-phone').find('span').text("Подтвердить")
                        $('#sms').attr('disabled', false).focus();
                    })
                    .fail(function (error) {
                        alert('Ошибка при отправке мобильного телефона');
                        //clear sms md5
                        localStorage.removeItem('sms_code_md5');
                        localStorage.removeItem('sms_code_timestamp');
                        $('.button-check-phone-sms').attr('disabled', false);
                    })
            } catch (error) {
                console.log('sendSmsCodeToBackend error', error)
            }
        }

        function sendSmsCodeToBackend() {
            try {
                var sms = $('#sms').val().trim();
                var user_sms_md5 = md5(sms);
                var sms_local_storage = localStorage.getItem('sms_code_md5');

                if (sms_local_storage) {
                    if (sms !== '') {
                        if (sms_local_storage === user_sms_md5) {
                            // after success
                            $('.field-sms-check .cols').hide();
                            $('.field-sms-check-success').addClass('active');
                            $('#phone-mask').attr('disabled', true);
                            $('.resendSms').remove();
                            //clear sms md5
                            localStorage.removeItem('sms_code_md5');
                            localStorage.removeItem('sms_code_timestamp');
                            //phone is checked
                            questionnaire.contactData.phoneChecked = true;
                        } else {
                            // custom user error for sms
                            $('#sms').closest('.field').addClass('status-failure').find('.field-message').text('Неправильный SMS-код');
                        }
                    } else {
                        // fire validation on sms field
                        var smsField = $('.form-main [data-validator="sms"]');
                        runSubmitValidate(smsField);
                    }
                }
            } catch (error) {
                localStorage.removeItem('sms_code_md5');
                localStorage.removeItem('sms_code_timestamp');
                console.log('sendSmsCodeToBackend error', error)
            }
        }
    }

    function initialStepLoanCalculation() {
        if ($('.slider-step-summ-holder').length > 0) {
            var holder = $('.slider-step-summ-holder');
            var loanInput = holder.find('.slider-range-input');
            var loanTextarea = holder.find('#slider-range-sum-value');
            var totalText = $('#setting-total');
            var buttonChange = $('.change-loan-summ-slider');

            var termInput = holder.find('#slider-range-term');
            var termTextarea = holder.find('#slider-range-term-value');

            new Powerange(loanInput.get(0), {
                callback: function () {
                    var val = loanInput.val()
                    if (!val) { loanInput.val(loanMinTerm); val = loanMinTerm }
                    var summNormilize = Number(parseInt(val)).toCurrencyString();
                    let retSum = parseInt(val) * (1 + parseInt(questionnaire.loanTerm) * parseFloat(loanPercentPerDay) / 100) + parseFloat(activationPrice);
                    loanTextarea.val(summNormilize)
                    totalText.text(summNormilize)
                    Cookies.set('summ', val);
                },
                decimal: false,
                min: loanMinSum,
                max: loanMaxSum,
                start: questionnaire.loanSum,
                step: loanCalcStep
            });

            new Powerange(termInput.get(0), {
                callback: function () {
                    var val = parseFloat(termInput.val())
                    if (!val) { termInput.val(loanMinTerm); val = loanMinTerm }

                    termTextarea.text(val);
                    $('#slider-range-term-unit,#setting-term-unit').text(getTermUnit(val));

                    $('#setting-term-amount').text(val);
                    Cookies.set('term', val);
                },
                decimal: false,
                min: loanMinTerm,
                max: loanMaxTerm,
                start: questionnaire.loanTerm,
            });


            holder.hide();

            buttonChange.click(function (e) {
                e.preventDefault();
                if ($(e.currentTarget).hasClass('active')) {
                    holder.slideUp();
                    $(e.currentTarget).removeClass('active')
                    buttonChange.text('Изменить')

                    //update main obj
                    questionnaire.loanSum = parseInt(loanInput.val());
                    questionnaire.loanTerm = parseInt(termInput.val());

                    questionnaire.requestUpdateLoanTerm('contact')

                } else {
                    $(e.currentTarget).addClass('active')
                    holder.slideDown();
                    buttonChange.text('Сохранить')
                }
            })
        }
    }

    function initCustomSelect() {
        $('.custom-select').each(function () {
            var $this = $(this), numberOfOptions = $(this).children('option').length;

            $this.addClass('select-hidden');
            $this.wrap('<div class="select"></div>');
            $this.after('<div class="select-styled"></div>');

            var $styledSelect = $this.next('div.select-styled');
            $styledSelect.text($this.children('option').eq(0).text());

            var $list = $('<ul />', {
                'class': 'select-options'
            }).insertAfter($styledSelect);

            for (var i = 0; i < numberOfOptions; i++) {
                $('<li />', {
                    text: $this.children('option').eq(i).text(),
                    rel: $this.children('option').eq(i).val()
                }).appendTo($list);
            }

            var $listItems = $list.children('li');

            $styledSelect.click(function (e) {
                e.stopPropagation();
                $('div.select-styled.active').not(this).each(function () {
                    $(this).removeClass('active').next('ul.select-options').hide();
                });
                $(this).toggleClass('active').next('ul.select-options').toggle();
            });

            $listItems.click(function (e) {
                e.stopPropagation();
                $styledSelect.text($(this).text()).removeClass('active');
                $this.val($(this).attr('rel'));
                $list.hide();
            });

            $(document).click(function () {
                $styledSelect.removeClass('active');
                $list.hide();
            });

        });
    }

    function finalPageFilter() {
        var filterInput = $('.final-filter input');
        var cardsHolder = $('.form-steps .cards');
        var cards = cardsHolder.find('.cards-item');
        var activeFilters = { bestoffer: false, approval: false, loanzero: false };
        filterInput.change(function (e) {
            var isChecked = $(e.currentTarget).prop('checked')
            var type = $(e.currentTarget).prop('name');

            activeFilters[type] = isChecked;

            if (activeFilters.bestoffer === false && activeFilters.approval === false && activeFilters.loanzero === false) {
                cards.fadeIn();
                return false;
            }
            first:
            for (let i = 0; i < cards.length; i++) {
                var element = $(cards[i]);
                var labels = element.find('.item-label');
                for (var j = 0; j < labels.length; j++) {
                    var label = labels[j];
                    var elType = $(label).attr('data-type');
                    if (elType && activeFilters[elType]) {
                        element.fadeIn();
                        continue first;
                    }
                }
                element.fadeOut();
            }
        })
    }

    function finalPageCardAdapatationFix() {

        function cardStyles() {
            if ($(window).width() <= 768) {
                $('.cards .cards-item').each(function (i, elem) {
                    if ($(elem).find('.item-label').length > 0) {
                        $(elem).css('margin-top', 30);
                    }
                })
            }
        }
        cardStyles();
        $(window).resize(function (e) {
            if ($(window).width() <= 768) {
                cardStyles()
            } else {
                $('.cards .cards-item').attr('style', null)
            }
        })
    }

    function finalPageBigCard() {
        $('.big-cards-item .big-cards-close').click(function (e) {
            e.preventDefault();
            var item = $(e.currentTarget).closest('.big-cards-item');
            item.addClass('disabled').removeClass('active');
        })
        var item = $('.big-cards-item');
        if ($('.big-cards-item').length > 0) {
            $(window).scroll(function (e) {
                var scrollUp = e.currentTarget.scrollY;
                var centerPage = $(document).height() * 0.2;
                if (scrollUp >= centerPage && !item.hasClass('active') && !item.hasClass('disabled')) {
                    item.addClass('active');
                }
            });
        }
    }

    function goTo() {
        $('.scroll-menu a').click(function (e) {

            var href = $(this).attr('href');
            var target;
            if (href[0] === '/') {
                href = href.substr(1);
                target = $(href).offset().top;
                if (target.length === 0) {
                    window.location.href = href;
                    return;
                }
            } else {
                target = $(href).offset().top;
            }

            e.preventDefault();
            $('body,html').animate({ scrollTop: target }, 500);
        });
    }

    function scrollUp(block, targetBlock) {
        $(block).click(function (e) {
            var target = $(targetBlock).offset().top;

            $('body,html').stop().animate({ scrollTop: target }, 800);
            return false;

            e.preventDefault();
        });
    }

    function loadingPaymentIframe() {
        if ($('#payFrame').length > 0) {
            $('#payFrame').on('load', function () {
                $('.card-form-loader').remove();
            })
        }
    }


    function replaceFiledBetweenTwoPagesSuperFix() {

        if ($('#birth-date').length > 0) {
            var birthdateSession = sessionStorage.getItem('birthdate');
            if (birthdateSession) {
                $('#birth-date').val(birthdateSession)
            }
            $('#birth-date').change(function (e) {
                var birthdate = $(e.currentTarget).val();
                if (birthdate) sessionStorage.setItem('birthdate', birthdate)
            })
        }

        if ($('#realaddrRegion').length > 0) {
            var realaddRegionText = sessionStorage.getItem('realaddrregion');
            if (realaddRegionText) {
                $('#realaddrRegion').val(realaddRegionText)
                if (questionnaire && questionnaire.passportData) questionnaire.passportData.realaddrregion = realaddRegionText
            }
        }

        if ($('.js-step-2')) {
            const birthdateSession = sessionStorage.getItem('birthdate')
            if (birthdateSession) questionnaire.passportData.birthdate = birthdateSession;
        }
    }



    $(document).ready(function () {
        checkPhoneFromSms();

        //init range slider in step
        initialStepLoanCalculation();

        // custom select
        initCustomSelect();

        //final page filter itens
        finalPageFilter();

        finalPageCardAdapatationFix();

        //big green card
        finalPageBigCard();

        //scroll from header menu
        goTo();

        loadingPaymentIframe();

        replaceFiledBetweenTwoPagesSuperFix();

    })
})
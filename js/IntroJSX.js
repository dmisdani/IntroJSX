/**
 * IntroJSX (IntoJS extended).js v1.0.0
 * https://github.com/dmisdani
 * MIT licensed
 *
 * 2015 Dimitris Misdanitis
 *
 * Inspired by Afshin Mehrabani's (@afshinmeh) Intro.js
 *
 * Why to use IntoJSX /what differs from Intro.js:
 * 0) The "core" functions re-designed
 * 1) showHint (badge) functionality. When you just want to make the user notice something. No need to start an introduction!
 * 2) You can combine html and DOM introduction elements.
 * 3) Every introduction element has a property "duration" (in seconds). So the element will disappear after that time or it will go to the next step.
 * 4) autoPlay functionality. No need to click/press keys to go to the next step.
 * 5) You can dynamically append or replace a introduction element using JS.
 * 6) the _showElement function was messy, so re-written.
 * 7) Introduction element types: "tooltip", "badge" , "floating"
 * 8) Some ui improvements
 *
 * Downsides: No callbacks. actually i don't need them now, maybe later.
 */


//UMD: Universal Module Definition
//http://davidbcalhoun.com/2014/what-is-amd-commonjs-and-umd/
(function (root, factory) {
    if (typeof exports === 'object') {
        // CommonJS
        factory(exports);
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports'], factory);
    } else {
        // Browser globals
        factory(root);
    }
}(this, function (exports) {
    //Default config/variables
    var VERSION = '1.0.0';


    function IntroJSX(obj) {
        this._targetElement = obj;
        this.introItems = [];
        this.currentStep = 0;
        this.introductionStarted = false;
        this.stopRecursion = 0;
        this.has_attached_listeners = false;

        this._options = {
            /* Next CSS class for tooltip boxes */
            tooltipClass: '',
            /* CSS class that is added to the helperLayer */
            highlightClass: '',
            /* Default tooltip box position */
            tooltipPosition: 'auto',
            /* Precedence of positions, when auto is enabled */
            positionPrecedence: ["bottom", "top", "right", "left"],
            /* Set the overlay opacity */
            overlayOpacity: 0.8,
            //Show bullets
            showBullets: true,
            //Show progress bar
            showProgress: true,
            //Button Labels
            nextLabel: "Next",
            prevLabel: "Previous",
            skipLabel: "Skip",
            doneLabel: "Done",
            //The Number layer
            showStepNumbers: true,
            //Navigation Buttons on tooltip
            showButtons: true,
            //The Default Badge Icon, (an arrow)
            defaultBadgeChar: "&#10136;",
            //The Defalt badge text (only during introduction
            defaultBadgeIntroText: "Note this!",
            //The default badge duration. If it is 0 it stays visible until a click/keypress.
            defaultBadgeDuration: 0,
            //The step duration (in sec) , during an introduction. Takes effecty only if autoPlay is enabled
            defaultStepDuration: -1,
            //The autoPlay switch of the introduction
            autoPlay: false,
            //Don't read the HTML DOM for introduction elements
            ignoreHTMLtags: false,
            //You can set the introduction steps here
            introSteps: []
                /*[{
                                "element": "#save",
                                "text": "hello",
                                "type": "badge",
                                "duration": 1

                            }, {
                                "element": "#test3",
                                "text": "hello again",
                                "type": "badge",
                                "duration": 3

                            }, {
                                "element": "#test2",
                                "text": "Dimitris",
                                "type": "floating",
                                "duration": 3,
                                "append": true
                            }]*/

        };
    }



    /**
     * Initiate a new introduction/guide from an element in the page
     * 1) we can pass programatically the introduction elements in this._options.introSteps
     * e.g  introSteps: [{"element":"#save","intro":"hello","type":"badge"},{"element":"#load","intro":"hello again","type":"tooltip"}]
     * 2) At the same time you can pass them via HTML tags
     * e.g :   <a id="save" intro-step="1" intro-type="badge" intro-text="" intro-duration="" .....>
     * Priority is always the Programmatically way , but if ignoreHTMLtags ==1 then it completelly ignores the HTML tags.
     * Note: intro-step is the step number, intro-test is the tooltip text, intro-type is badge|tooltip|floating ,intro-duration is the wait time of the step
     *
     * @api private
     * @method _initializeElements
     * @param {Object} targetElm
     * @returns {Boolean} Success or not?
     */

    function _initializeElements(targetElm) {
        var htmlItems = [],
            jsItems = [];
        var self = this;
        var i;
        //Read the DOM and take the html items.
        if (!this._options.ignoreHTMLtags) {
            //use steps from intro-* annotations
            var allIntroElements = targetElm.querySelectorAll('*[intro-step]');
            if (allIntroElements.length > 0) {
                //first add intro items with data-step
                for (i = 0; i < allIntroElements.length; i++) {
                    var currentElement = allIntroElements[i];
                    var step = parseInt(currentElement.getAttribute('intro-step'), 10);
                    //This is a introduction, so intro-step is required . 
                    //If you don't want to pass intro-step just use the showHint.
                    if (step > 0) {
                        htmlItems[step - 1] = {
                            element: currentElement,
                            type: _checkInput(currentElement.getAttribute('intro-type'), ["badge", "tooltip", "floating"], "badge"),
                            text: currentElement.getAttribute('intro-text'),
                            step: step,
                            duration: _checkInput(parseInt(currentElement.getAttribute('intro-duration'), 10), "number", this._options.defaultStepDuration),
                            tooltipClass: currentElement.getAttribute('data-tooltipClass'),
                            highlightClass: currentElement.getAttribute('data-highlightClass'),
                            position: currentElement.getAttribute('data-position') || this._options.tooltipPosition
                        };
                    }

                }
            }
        }
        //Read the steps from this._options.introSteps
        if (this._options.introSteps.length) {
            for (var i = 0; i < this._options.introSteps.length; i++) {
                var currentItem = _cloneObject(this._options.introSteps[i]);
                //currentItem.step = i + 1;
                if (currentItem.step <= 0) continue;
                //use querySelector function only when developer used CSS selector
                if (typeof (currentItem.element) === 'string') {
                    currentItem.element = document.querySelector(currentItem.element);
                }
                //intro without element means a generic tooltip at the center of the screen.
                if (typeof (currentItem.element) === 'undefined' || currentItem.element == null || currentItem.type == "floating") {
                    var floatingElementQuery = document.querySelector(".introjsFloatingElement");
                    if (floatingElementQuery == null) {
                        floatingElementQuery = document.createElement('div');
                        floatingElementQuery.className = 'introjsFloatingElement';
                        document.body.appendChild(floatingElementQuery);
                    }
                    currentItem.element = floatingElementQuery;
                    currentItem.position = 'floating';
                    currentItem.type = "floating";
                }
                if (typeof (currentItem.type) === 'undefined' || currentItem.type == null) currentItem.type = "badge";
                if (typeof (currentItem.duration) === 'undefined' || currentItem.duration == null) currentItem.duration = this._options.defaultStepDuration;
                if (typeof (currentItem.position) === 'undefined' || currentItem.position == null) currentItem.position = this._options.tooltipPosition;
                if (typeof (currentItem.append) === 'undefined' || currentItem.append == null) currentItem.append = false;
                currentItem.type = _checkInput(currentItem.type, ["badge", "tooltip", "floating"], "badge");
                currentItem.duration = _checkInput(currentItem.duration, "number", this._options.defaultStepDuration);
                currentItem.append = _checkInput(currentItem.append, "boolean", false);

                if (currentItem.element != null) {
                    jsItems.push(currentItem);
                }
            }
        }

        //removing undefined/null elements
        var tempIntroItems = [];
        for (var z = 0; z < jsItems.length; z++) {
            jsItems[z] && tempIntroItems.push(jsItems[z]); // copy non-empty values to the end of the array
        }
        jsItems = tempIntroItems;
        var tempIntroItems = [];
        for (var z = 0; z < htmlItems.length; z++) {
            htmlItems[z] && tempIntroItems.push(htmlItems[z]); // copy non-empty values to the end of the array
        }
        htmlItems = tempIntroItems;

        //sort items with given steps
        jsItems.sort(function (a, b) {
            return a.step - b.step;
        });
        htmlItems.sort(function (a, b) {
            return a.step - b.step;
        });


        //Merge the 2 arrays. Priority always to the jsItems.
        //So first read the HTML items and then override with js items if append=false,or append the items with append=true. 

        if (!jsItems.length && !htmlItems.length) return false;
        if (this._options.ignoreHTMLtags == true || !htmlItems.length) {
            this.introItems = jsItems;
            return true;
        }
        var tempIntroItems = htmlItems.slice();
        for (var i = 0; i < jsItems.length; i++) {
            stepJS = jsItems[i].step;
            tmp_html = _objectFindByKey(tempIntroItems, "step", stepJS);
            if (tmp_html != null) {
                if (jsItems[i].append) {
                    tempIntroItems.splice(stepJS - 1, 0, jsItems[i]);
                    tmp_html.step = tmp_html.step + 1;
                } else {
                    tempIntroItems.splice(stepJS - 1, 1, jsItems[i]);
                }
            } else {
                tempIntroItems.splice(stepJS - 1, 0, jsItems[i]);
            }
        }
        //correct any step numbers and sort them
        for (var i = 0; i < tempIntroItems.length; i++) {
            tempIntroItems[i].step = i + 1;
        }
        tempIntroItems.sort(function (a, b) {
            return a.step - b.step;
        });

        this.introItems = tempIntroItems;
        return true;
    }



    /**
     * Checks the input
     *e.g checks if the intro-type is between tooltip,badge,floating values
     *e.g2 checks if the duration is integer, if not it returns the default value.
     *
     * @api private
     * @method _checkInput
     * @param {Object} input , {Object} compare_with ,  {Object} defaultValue
     * @returns {Object}
     */
    function _checkInput(input, compare_with, defaultValue) {
        if (typeof (compare_with) === "object") {
            var i;
            for (i = 0; i < compare_with.length; i++) {
                if (compare_with[i] === input) {
                    return input;
                }
            }
        } else {
            if (compare_with == "number") {
                if ((typeof (input) === compare_with) && !isNaN(parseInt(input))) return input;
            } else {
                if (typeof (input) === compare_with) return input;
            }
        }
        return defaultValue;

    }


    /**
     * Starts the Introduction
     *
     * @api private
     * @method _startIntoduction
     * @param
     * @returns
     */
    function _startIntoduction() {
        if (!this.introductionStarted) {
            if (this._options.autoPlay) this.stopRecursion = 0;
            var success = _initializeElements.call(this, this._targetElement);
            if (success) {
                this.introductionStarted = true;
                _nextStep.call(this);
            }
        }
    }


    /**
     * Stops the Introduction
     *
     * @api private
     * @method _stopIntoduction
     * @param
     * @returns
     */
    function _stopIntoduction() {
        this.currentStep = 0;
        _clearAll.call(self, this._targetElement);
        this.introductionStarted = false;
    }



    /**
     * Go to the Next Step
     *
     * {auto} parameter is used to distinguish the function call when is called by the timer (autoPlay mode)
     *
     * @api private
     * @method _nextStep
     * @param {boolean} auto
     * @returns
     */
    function _nextStep(auto) {
        if (auto && this.stopRecursion) {
            return;
        }
        if (!this.introductionStarted) return;
        if (this.currentStep + 1 <= this.introItems.length) {
            this.currentStep++;
            tmp = _objectFindByKey(this.introItems, "step", this.currentStep);
            if (tmp != null)
                _showItem.call(this, tmp);
            else
                _stopIntoduction.call(this);
        } else {
            this.stopRecursion = 1;
            _clearAll.call(self, this._targetElement);
        }

    }




    /**
     * Go to the Previous Step
     *
     * @api private
     * @method _stopIntoduction
     * @param
     * @returns
     */
    function _previousStep() {
        if (!this.introductionStarted) return;
        if (this.currentStep > 0) {
            this.currentStep--;
            tmp = _objectFindByKey(this.introItems, "step", this.currentStep);
            if (tmp != null)
                _showItem.call(this, tmp);
            else
                _stopIntoduction.call(this);
        } else {
            self.currentStep++;
        }
    }




    /**
     * Go to a specific Step
     *
     * @api private
     * @method _stopIntoduction
     * @param
     * @returns
     */
    function _goToStep(step) {
        if (!this.introductionStarted) return;
        this.currentStep = step;
        tmp = _objectFindByKey(this.introItems, "step", this.currentStep);
        if (tmp != null)
            _showItem.call(this, tmp);
        else
            _stopIntoduction.call(this);
    }


    /**
     * Show the introduction step
     *
     *   Structure of the Div Layers
     *
     * introjs-overlay                         Top Fade Effect layer, onClick Exit Intro  ,
     * introjs-helperLayer                     The Gray box of the target Element. It helps to highlight the target Element
     * introjs-tooltipReferenceLayer           The Reference Layer. The tooltip layer and the number layer are built under this.
     *   \-introjs-helperNumberLayer           Number/sign
     *    -introjs-tooltip                     The actual tooltip
     * 	    \-	introjs-tooltiptext             The text
     * 	     - introjs-bullets                 The bullets
     * 	     -	introjs-progress                Progress bar top layer (if enabled)
     * 		     \-	introjs-progressbar         Actuasl progress bar
     * 	     -	introjs-arrow                   The arrow (of the tooltip balloon)
     * 	     -	introjs-tooltipbuttons          Top Layer of the buttons
     *
     * @api private
     * @method _showItem
     * @param {object} targetElement
     * @returns
     */
    function _showItem(targetElement) {
        var self = this;
        //We need to check what kind of element is it
        var type = targetElement.type;

        var overlayLayer = document.querySelector('.introjs-overlay');
        var highlightClass = 'introjs-helperLayer';

        //check for a current step highlight class
        if (typeof (targetElement.highlightClass) === 'string') {
            highlightClass += (' ' + targetElement.highlightClass);
        }
        //check for options highlight class
        if (typeof (this._options.highlightClass) === 'string') {
            highlightClass += (' ' + this._options.highlightClass);
        }

        //add overlay layer to the page. 
        if (overlayLayer == null) {
            _addOverlayLayer.call(self, this._targetElement);
        }

        //Check if Layers already exists
        var helperLayer = document.querySelector('.introjs-helperLayer');
        if (helperLayer == null) {
            helperLayer = document.createElement('div');
            helperLayer.className = highlightClass;
            //add helper layer to target element
            this._targetElement.appendChild(helperLayer);
        }

        //reference Layer
        var referenceLayer = document.querySelector('.introjs-tooltipReferenceLayer');
        if (referenceLayer == null) {
            referenceLayer = document.createElement('div');
            referenceLayer.className = 'introjs-tooltipReferenceLayer';
            //add referenceLayer layer to target element
            this._targetElement.appendChild(referenceLayer);
        }

        //add helper layer number
        var helperNumberLayer = referenceLayer.querySelector('.introjs-helperNumberLayer');
        if (helperNumberLayer == null) {
            var helperNumberLayer = document.createElement('span');
            helperNumberLayer.className = 'introjs-helperNumberLayer';
            helperNumberLayer.innerHTML = targetElement.step;
            if (this._options.showStepNumbers) {
                helperNumberLayer.style.opacity = 1;
                helperNumberLayer.style.display = "block";
            } else {
                helperNumberLayer.style.opacity = 0;
                helperNumberLayer.style.display = "none";
            }
            referenceLayer.appendChild(helperNumberLayer);
        }

        //Tooltip Container
        var tooltipContainer = referenceLayer.querySelector('.introjs-tooltip');
        if (tooltipContainer == null) {
            tooltipContainer = document.createElement('div');
            tooltipContainer.className = 'introjs-tooltip';
            referenceLayer.appendChild(tooltipContainer);
            tooltipContainer.style.display = "block";
            tooltipContainer.style.opacity = 1;
        }

        //Tooltip Text box
        var tooltipTextLayer = referenceLayer.querySelector('.introjs-tooltiptext');
        if (tooltipTextLayer == null) {
            tooltipTextLayer = document.createElement('div');
            tooltipTextLayer.className = 'introjs-tooltiptext';
            tooltipContainer.appendChild(tooltipTextLayer);
        }

        //Tooltip small arrow            
        var arrowLayer = referenceLayer.querySelector('.introjs-arrow');
        if (arrowLayer == null) {
            var arrowLayer = document.createElement('div');
            arrowLayer.className = 'introjs-arrow';
            tooltipContainer.appendChild(arrowLayer);
        }

        //Buttons
        var bulletsLayer = referenceLayer.querySelector('.introjs-bullets');
        if (bulletsLayer == null) {
            var bulletsLayer = document.createElement('div');
            bulletsLayer.className = 'introjs-bullets';
            if (this._options.showBullets === false) {
                bulletsLayer.style.display = 'none';
            }
            var ulContainer = document.createElement('ul');
            for (var i = 0; i < this.introItems.length; i++) {
                var innerLi = document.createElement('li');
                var anchorLink = document.createElement('a');

                anchorLink.onclick = function () {
                    self.stopRecursion = 1;
                    _goToStep.call(self, parseInt(this.getAttribute('intro-stepnumber'), 10));
                };

                if (i === (targetElement.step - 1)) anchorLink.className = 'active';

                anchorLink.href = 'javascript:void(0);';
                anchorLink.innerHTML = "&nbsp;";
                anchorLink.setAttribute('intro-stepnumber', this.introItems[i].step);

                innerLi.appendChild(anchorLink);
                ulContainer.appendChild(innerLi);
            }

            bulletsLayer.appendChild(ulContainer);
            tooltipContainer.appendChild(bulletsLayer);

        }

        //Progress bar
        var progressLayer = referenceLayer.querySelector('.introjs-progress');
        if (progressLayer == null) {
            var progressLayer = document.createElement('div');
            progressLayer.className = 'introjs-progress';
            if (this._options.showProgress === false) {
                progressLayer.style.display = 'none';
            }

            var progressBar = document.createElement('div');
            progressBar.className = 'introjs-progressbar';
            progressBar.setAttribute('style', 'width:' + _getProgress.call(this) + '%;');

            progressLayer.appendChild(progressBar);
            tooltipContainer.appendChild(progressLayer);
        }


        //Buttons Layer
        var buttonsLayer = referenceLayer.querySelector('.introjs-tooltipbuttons');
        if (buttonsLayer == null) {
            var buttonsLayer = document.createElement('div');
            buttonsLayer.className = 'introjs-tooltipbuttons';
            if (this._options.showButtons === false) {
                buttonsLayer.style.display = 'none';
            }
            tooltipContainer.appendChild(buttonsLayer);

        }
        //Skip button
        var skipTooltipButton = referenceLayer.querySelector('.introjs-skipbutton');
        if (skipTooltipButton == null) {
            var skipTooltipButton = document.createElement('a');
            skipTooltipButton.className = 'introjs-button introjs-skipbutton';
            skipTooltipButton.href = 'javascript:void(0);';
            skipTooltipButton.innerHTML = this._options.skipLabel;
            skipTooltipButton.onclick = function () {
                self.stopRecursion = 1;
                _stopIntoduction.call(self);
            };
            buttonsLayer.appendChild(skipTooltipButton);
        }
        //Previous button
        var prevTooltipButton = referenceLayer.querySelector('.introjs-prevbutton');
        if (prevTooltipButton == null) {
            var prevTooltipButton = document.createElement('a');
            prevTooltipButton.className = 'introjs-button introjs-prevbutton';
            prevTooltipButton.href = 'javascript:void(0);';
            prevTooltipButton.innerHTML = this._options.prevLabel;
            prevTooltipButton.onclick = function () {
                self.stopRecursion = 1;
                if (self.currentStep > 1) {
                    _previousStep.call(self);
                }
            };
            buttonsLayer.appendChild(prevTooltipButton);
        }

        //NextButton
        var nextTooltipButton = referenceLayer.querySelector('.introjs-nextbutton');
        if (nextTooltipButton == null) {
            var nextTooltipButton = document.createElement('a');
            nextTooltipButton.className = 'introjs-button introjs-nextbutton';
            nextTooltipButton.href = 'javascript:void(0);';
            nextTooltipButton.innerHTML = this._options.nextLabel;
            nextTooltipButton.onclick = function () {
                self.stopRecursion = 1;
                if (self.currentStep < self.introItems.length) {
                    _nextStep.call(self);
                }
            };
            buttonsLayer.appendChild(nextTooltipButton);
        }

        //hide arrow , tooltip ,HelperNumberLayer  We will show them later.
        tooltipContainer.style.opacity = 0;
        tooltipContainer.style.display = "none";
        arrowLayer.style.display = "none";
        helperNumberLayer.style.opacity = 0;
        //remove old classes
        var showElement = document.querySelector('.introjs-showElement');
        if (showElement != null) showElement.className = showElement.className.replace(/introjs-[a-zA-Z]+/g, '').replace(/^\s+|\s+$/g, '');

        //we should wait until the CSS3 transition is competed (it's 0.3 sec) to prevent incorrect `height` and `width` calculation
        if (self._lastShowElementTimer) {
            clearTimeout(self._lastShowElementTimer);
        }

        self._lastShowElementTimer = setTimeout(function () {
            //set current step to the label
            helperNumberLayer.innerHTML = targetElement.step;

            if (type != "badge")
                tooltipTextLayer.innerHTML = targetElement.text;
            else
                tooltipTextLayer.innerHTML = self._options.defaultBadgeIntroText;

            //set the tooltip position
            tooltipContainer.style.display = "block";
            _placeTooltip.call(self, targetElement, tooltipContainer, arrowLayer, helperNumberLayer);
            //change active bullet
            referenceLayer.querySelector('.introjs-bullets li > a.active').className = '';
            referenceLayer.querySelector('.introjs-bullets li > a[intro-stepnumber="' + targetElement.step + '"]').className = 'active';
            referenceLayer.querySelector('.introjs-progress .introjs-progressbar').setAttribute('style', 'width:' + _getProgress.call(self) + '%;');
            tooltipContainer.style.opacity = 1;
            //Show the number layer
            if (helperNumberLayer && self._options.showStepNumbers) helperNumberLayer.style.opacity = 1;

            //reset button focus
            if (nextTooltipButton.tabIndex === -1) {
                //tabindex of -1 means we are at the end of the tour - focus on skip / done
                skipTooltipButton.focus();
            } else {
                //still in the tour, focus on next
                nextTooltipButton.focus();
            }

        }, 350);



        //On Resize, correct the possition of helperLayer and tooltipReferenceLayer
        self._onResize = function (e) {
            tmp = _objectFindByKey(self.introItems, "step", self.currentStep);
            _setHelperLayerPosition.call(self, document.querySelector('.introjs-helperLayer'), tmp.element);
            _setHelperLayerPosition.call(self, document.querySelector('.introjs-tooltipReferenceLayer'), tmp.element);
        }

        //Key Events for navigation
        self._onKeyDown = function (e) {
            if (e.keyCode === 27) {
                //escape key pressed, exit the intro
                _stopIntoduction.call(self);
            } else if (e.keyCode === 37) {
                //left arrow
                if (self.currentStep > 1) {
                    _previousStep.call(self);
                }
            } else if (e.keyCode === 39) {
                //right arrow
                if (self.currentStep < self.introItems.length) {
                    _nextStep.call(self);
                } else {
                    _stopIntoduction.call(self);
                    self.currentStep = 1;
                }
            } else if (e.keyCode === 13) {
                //srcElement === ie
                var target = e.target || e.srcElement;
                if (target && target.className.indexOf('introjs-prevbutton') > 0) {
                    //user hit enter while focusing on previous button
                    _previousStep.call(self);
                } else if (target && target.className.indexOf('introjs-skipbutton') > 0) {
                    //user hit enter while focusing on skip button
                    _exitIntro.call(self, targetElm);
                } else {
                    //default behavior for responding to enter
                    _nextStep.call(self);

                }

                //prevent default behaviour on hitting Enter, to prevent steps being skipped in some browsers
                if (e.preventDefault) {
                    e.preventDefault();
                } else {
                    e.returnValue = false;
                }
            }
            self.stopRecursion = 1;

        };

        //Only attach the listeners the first time we build the layers
        if (!this.has_attached_listeners) {
            //attach event listeners
            if (window.addEventListener) {
                //Keys
                window.addEventListener('keydown', self._onKeyDown, true);

                //for window resize
                window.addEventListener('resize', self._onResize, true);
            } else if (document.attachEvent) { //IE
                //document.attachEvent('onkeydown', self._onKeyDown);
                //for window resize
                document.attachEvent('onresize', self._onResize);
            }
            this.has_attached_listeners = true;
        }

        //set new position to helper layer
        _setHelperLayerPosition.call(self, helperLayer, targetElement.element);
        _setHelperLayerPosition.call(self, referenceLayer, targetElement.element);

        //remove `introjs-fixParent` class from the elements
        var fixParents = document.querySelectorAll('.introjs-fixParent');
        if (fixParents && fixParents.length > 0) {
            for (var i = fixParents.length - 1; i >= 0; i--) {
                fixParents[i].className = fixParents[i].className.replace(/introjs-fixParent/g, '').replace(/^\s+|\s+$/g, '');
            };
        }
        //focus, enable disable the buttons
        prevTooltipButton.removeAttribute('tabIndex');
        nextTooltipButton.removeAttribute('tabIndex');

        if (this.currentStep == 1 && this.introItems.length > 1) {
            prevTooltipButton.className = 'introjs-button introjs-prevbutton introjs-disabled';
            prevTooltipButton.tabIndex = '-1';
            nextTooltipButton.className = 'introjs-button introjs-nextbutton';
            skipTooltipButton.innerHTML = this._options.skipLabel;
        } else if (this.introItems.length == this.currentStep || this.introItems.length == 1) {
            skipTooltipButton.innerHTML = this._options.doneLabel;
            prevTooltipButton.className = 'introjs-button introjs-prevbutton';
            nextTooltipButton.className = 'introjs-button introjs-nextbutton introjs-disabled';
            nextTooltipButton.tabIndex = '-1';
        } else {
            prevTooltipButton.className = 'introjs-button introjs-prevbutton';
            nextTooltipButton.className = 'introjs-button introjs-nextbutton';
            skipTooltipButton.innerHTML = this._options.skipLabel;
        }

        //Set focus on "next" button, so that hitting Enter always moves you onto the next step
        nextTooltipButton.focus();
        //add target element position style
        targetElement.element.className += ' introjs-showElement';

        var currentElementPosition = _getPropValue(targetElement.element, 'position');
        if (currentElementPosition !== 'absolute' && currentElementPosition !== 'relative') {
            //change to new intro item
            targetElement.element.className += ' introjs-relativePosition';
        }
        //auto play
        if (this._options.autoPlay) {

            if (targetElement.duration > 0 && this.stopRecursion == 0) {
                self._lastShowElementTimer = setTimeout(function () {
                    _nextStep.call(self, true);
                }, targetElement.duration * 1000);
            }

        }
    }


    /**
     * Determines the position of the tooltip based on the position precedence and availability
     * of screen space.
     *
     * @param {Object} targetElement
     * @param {Object} tooltipLayer
     * @param {Object} desiredTooltipPosition
     *
     */
    function _determineAutoPosition(targetElement, tooltipLayer, desiredTooltipPosition) {

        // Take a clone of position precedence. These will be the available
        var possiblePositions = this._options.positionPrecedence.slice()

        var windowSize = _getWinSize()
        var tooltipHeight = _getOffset(tooltipLayer).height + 10
        var tooltipWidth = _getOffset(tooltipLayer).width + 20
        var targetOffset = _getOffset(targetElement)

        // If we check all the possible areas, and there are no valid places for the tooltip, the element
        // must take up most of the screen real estate. Show the tooltip floating in the middle of the screen.
        var calculatedPosition = "floating"

        // Check if the width of the tooltip + the starting point would spill off the right side of the screen
        // If no, neither bottom or top are valid
        if (targetOffset.left + tooltipWidth > windowSize.width || ((targetOffset.left + (targetOffset.width / 2)) - tooltipWidth) < 0) {
            _removeEntry(possiblePositions, "bottom")
            _removeEntry(possiblePositions, "top");
        } else {
            // Check for space below
            if ((targetOffset.height + targetOffset.top + tooltipHeight) > windowSize.height) {
                _removeEntry(possiblePositions, "bottom")
            }

            // Check for space above
            if (targetOffset.top - tooltipHeight < 0) {
                _removeEntry(possiblePositions, "top");
            }
        }

        // Check for space to the right
        if (targetOffset.width + targetOffset.left + tooltipWidth > windowSize.width) {
            _removeEntry(possiblePositions, "right");
        }

        // Check for space to the left
        if (targetOffset.left - tooltipWidth < 0) {
            _removeEntry(possiblePositions, "left");
        }

        // At this point, our array only has positions that are valid. Pick the first one, as it remains in order
        if (possiblePositions.length > 0) {
            calculatedPosition = possiblePositions[0];
        }

        // If the requested position is in the list, replace our calculated choice with that
        if (desiredTooltipPosition && desiredTooltipPosition != "auto") {
            if (possiblePositions.indexOf(desiredTooltipPosition) > -1) {
                calculatedPosition = desiredTooltipPosition
            }
        }

        return calculatedPosition
    }


    /**
     * Remove an entry from a string array if it's there, does nothing if it isn't there.
     *
     * @param {Array} stringArray
     * @param {String} stringToRemove
     */
    function _removeEntry(stringArray, stringToRemove) {
        if (stringArray.indexOf(stringToRemove) > -1) {
            stringArray.splice(stringArray.indexOf(stringToRemove), 1);
        }
    }

    /**
     * Gets the current progress percentage
     *
     * @api private
     * @method _getProgress
     * @returns current progress percentage
     */
    function _getProgress() {
        // Steps are 0 indexed
        var currentStep = parseInt((this.currentStep), 10);
        return ((currentStep / this.introItems.length) * 100);
    }




    /**
     * Render tooltip box in the page
     *
     * @api private
     * @method _placeTooltip
     * @param {Object} targetElement
     * @param {Object} tooltipLayer
     * @param {Object} arrowLayer
     * @param {Object} helperNumberLayer
     */
    function _placeTooltip(targetElement, tooltipLayer, arrowLayer, helperNumberLayer) {
        var tooltipCssClass = '',
            currentStepObj,
            tooltipOffset,
            targetElementOffset;

        //reset the old style
        tooltipLayer.style.top = null;
        tooltipLayer.style.right = null;
        tooltipLayer.style.bottom = null;
        tooltipLayer.style.left = null;
        tooltipLayer.style.marginLeft = null;
        tooltipLayer.style.marginTop = null;

        arrowLayer.style.display = 'inherit';

        if (typeof (helperNumberLayer) != 'undefined' && helperNumberLayer != null) {
            helperNumberLayer.style.top = null;
            helperNumberLayer.style.left = null;
        }

        //prevent error when `this._currentStep` is undefined
        //if (!this.introItems[this._currentStep]) return;

        //if we have a custom css class for each step
        currentStepObj = targetElement;
        if (typeof (currentStepObj.tooltipClass) === 'string') {
            tooltipCssClass = currentStepObj.tooltipClass;
        } else {
            tooltipCssClass = this._options.tooltipClass;
        }

        tooltipLayer.className = ('introjs-tooltip ' + tooltipCssClass).replace(/^\s+|\s+$/g, '');
        //custom css class for tooltip boxes
        var tooltipCssClass = this._options.tooltipClass;

        currentTooltipPosition = targetElement.position;

        if ((currentTooltipPosition == "auto" || this._options.tooltipPosition == "auto")) {
            if (currentTooltipPosition != "floating") { // Floating is always valid, no point in calculating
                currentTooltipPosition = _determineAutoPosition.call(this, targetElement.element, tooltipLayer, currentTooltipPosition);
            }
        }
        var targetOffset = _getOffset(targetElement.element);
        var tooltipHeight = _getOffset(tooltipLayer).height;
        var windowSize = _getWinSize();

        switch (currentTooltipPosition) {
        case 'top':
            tooltipLayer.style.left = '15px';
            tooltipLayer.style.top = '-' + (tooltipHeight + 10) + 'px';
            arrowLayer.className = 'introjs-arrow bottom';
            break;
        case 'right':
            tooltipLayer.style.left = (_getOffset(targetElement.element).width + 20) + 'px';
            if (targetOffset.top + tooltipHeight > windowSize.height) {
                // In this case, right would have fallen below the bottom of the screen.
                // Modify so that the bottom of the tooltip connects with the target
                arrowLayer.className = "introjs-arrow left-bottom";
                tooltipLayer.style.top = "-" + (tooltipHeight - targetOffset.height - 20) + "px"
            }
            arrowLayer.className = 'introjs-arrow left';
            break;
        case 'left':
            if (this._options.showStepNumbers == true) {
                tooltipLayer.style.top = '15px';
            }

            if (targetOffset.top + tooltipHeight > windowSize.height) {
                // In this case, left would have fallen below the bottom of the screen.
                // Modify so that the bottom of the tooltip connects with the target
                tooltipLayer.style.top = "-" + (tooltipHeight - targetOffset.height - 20) + "px"
                arrowLayer.className = 'introjs-arrow right-bottom';
            } else {
                arrowLayer.className = 'introjs-arrow right';
            }
            tooltipLayer.style.right = (targetOffset.width + 20) + 'px';


            break;
        case 'floating':
            arrowLayer.style.display = 'none';
            //we have to adjust the top and left of layer manually for intro items without element
            tooltipOffset = _getOffset(tooltipLayer);

            tooltipLayer.style.left = '50%';
            tooltipLayer.style.top = '50%';
            tooltipLayer.style.marginLeft = '-' + (tooltipOffset.width / 2) + 'px';
            tooltipLayer.style.marginTop = '-' + (tooltipOffset.height / 2) + 'px';

            if (typeof (helperNumberLayer) != 'undefined' && helperNumberLayer != null) {
                helperNumberLayer.style.left = '-' + ((tooltipOffset.width / 2) + 18) + 'px';
                helperNumberLayer.style.top = '-' + ((tooltipOffset.height / 2) + 18) + 'px';
            }

            break;
        case 'bottom-right-aligned':
            arrowLayer.className = 'introjs-arrow top-right';
            tooltipLayer.style.right = '0px';
            tooltipLayer.style.bottom = '-' + (_getOffset(tooltipLayer).height + 10) + 'px';
            break;
        case 'bottom-middle-aligned':
            targetElementOffset = _getOffset(targetElement.element);
            tooltipOffset = _getOffset(tooltipLayer);

            arrowLayer.className = 'introjs-arrow top-middle';
            tooltipLayer.style.left = (targetElementOffset.width / 2 - tooltipOffset.width / 2) + 'px';
            tooltipLayer.style.bottom = '-' + (tooltipOffset.height + 10) + 'px';
            break;
        case 'bottom-left-aligned':
            // Bottom-left-aligned is the same as the default bottom
        case 'bottom':
            // Bottom going to follow the default behavior
        default:
            tooltipLayer.style.bottom = '-' + (_getOffset(tooltipLayer).height + 10) + 'px';
            //tooltipLayer.style.left = (_getOffset(targetElement.element).width / 2 - _getOffset(tooltipLayer).width / 2) + 'px';
            tooltipLayer.style.left = _getOffset(targetElement.element).left - _getOffset(tooltipLayer).left;
            arrowLayer.className = 'introjs-arrow top';
            break;
        }


    }



    /**
     * Provides a cross-browser way to get the screen dimensions
     * via: http://stackoverflow.com/questions/5864467/internet-explorer-innerheight
     *
     * @api private
     * @method _getWinSize
     * @returns {Object} width and height attributes
     */
    function _getWinSize() {
        if (window.innerWidth != undefined) {
            return {
                width: window.innerWidth,
                height: window.innerHeight
            };
        } else {
            var D = document.documentElement;
            return {
                width: D.clientWidth,
                height: D.clientHeight
            };
        }
    }



    /*
     * Finds an item in an Object array
     * array = [{key:value},{key:value}]
     * @api private
     * @method _cloneObject
     */
    function _objectFindByKey(array, key, value) {
        for (var i = 0; i < array.length; i++) {
            if (array[i][key] === value) {
                return array[i];
            }
        }
        return null;
    }



    /*
     * makes a copy of the object
     * @api private
     * @method _cloneObject
     */
    function _cloneObject(object) {
        if (object == null || typeof (object) != 'object' || typeof (object.nodeType) != 'undefined') {
            return object;
        }
        var temp = {};
        for (var key in object) {
            temp[key] = _cloneObject(object[key]);
        }
        return temp;
    }


    /**
     * Get an element position on the page
     * Thanks to `meouw`: http://stackoverflow.com/a/442474/375966
     *
     * @api private
     * @method _getOffset
     * @param {Object} selector of the element
     * @returns Element's position info
     */
    function _getOffset(element) {
        var elementPosition = {};

        //set width
        elementPosition.width = element.offsetWidth;

        //set height
        elementPosition.height = element.offsetHeight;

        //calculate element top and left
        var _x = 0;
        var _y = 0;
        while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
            _x += element.offsetLeft;
            _y += element.offsetTop;
            element = element.offsetParent;
        }
        //set top
        elementPosition.top = _y;
        //set left
        elementPosition.left = _x;

        return elementPosition;
    }

    /**
     * Get an element CSS property on the page
     * Thanks to JavaScript Kit: http://www.javascriptkit.com/dhtmltutors/dhtmlcascade4.shtml
     *
     * @api private
     * @method _getPropValue
     * @param {Object} selector element
     * @param {String} propName
     * @returns Element's property value
     */
    function _getPropValue(element, propName) {
        var propValue = '';
        if (element.currentStyle) { //IE
            propValue = element.currentStyle[propName];
        } else if (document.defaultView && document.defaultView.getComputedStyle) { //Others
            propValue = document.defaultView.getComputedStyle(element, null).getPropertyValue(propName);
        }

        //Prevent exception in IE
        if (propValue && propValue.toLowerCase) {
            return propValue.toLowerCase();
        } else {
            return propValue;
        }
    }


    /**
     * Just display the badge, to make the user to notice something
     *
     *
     * @api private
     * @method _BadgeElement
     * @param {Object} parent object
     * @param {Object} selector of the element
     * @param {String} Text on the badge (be careful, don't set more than 2 chars)
     * @param {number} Duration in seconds
     * @returns Element's property value
     */
    function _BadgeElement(parent, selector, text, duration) {
        if (typeof (selector) === 'string') {
            currentItem = document.querySelector(selector);
        }

        //Check if the selector points to a DOM element
        if (typeof (currentItem) === 'undefined' || currentItem == null) {
            console.error(selector + " doesn't exist in the DOM");
            return false;
        }
        //If text not defined, then set the default arrow.
        if (typeof (text) === 'undefined' || text == "") text = this._options.defaultBadgeChar;
        //if duration not defined, set it to -1
        if (typeof (duration) === 'undefined' || duration == "" || typeof (duration) != 'number') duration = -1;

        var self = this;
        //add overlay layer to the page
        if (_addOverlayLayer.call(self, parent)) {
            // console.log("HI");


            var elementPosition = _getOffset(currentItem);
            //////////////////////////////////////////////
            var helperLayer = document.createElement('div');
            var referenceLayer = document.createElement('div');

            helperLayer.className = 'introjs-helperLayer';
            referenceLayer.className = 'introjs-tooltipReferenceLayer';
            _setHelperLayerPosition.call(self, referenceLayer, currentItem);
            _setHelperLayerPosition.call(self, helperLayer, currentItem);
            parent.appendChild(helperLayer);
            parent.appendChild(referenceLayer);
            //add helper layer to target element       

            var helperNumberLayer = document.createElement('span');
            helperNumberLayer.className = 'introjs-helperNumberLayer';

            helperNumberLayer.innerHTML = text;
            referenceLayer.appendChild(helperNumberLayer);
            currentItem.className += ' introjs-showElement';
            var currentElementPosition = _getPropValue(currentItem, 'position');
            if (currentElementPosition !== 'absolute' &&
                currentElementPosition !== 'relative') {
                //change to new intro item
                currentItem.className += ' introjs-relativePosition';
            }

            self._onResize = function (e) {
                _setHelperLayerPosition.call(self, document.querySelector('.introjs-helperLayer'), currentItem);
                _setHelperLayerPosition.call(self, document.querySelector('.introjs-tooltipReferenceLayer'), currentItem);
            }

            self._onKeyDown = function (e) {
                _clearAll.call(self, parent);
            }

            referenceLayer.onclick = function () {
                self.stopRecursion = 1;
                _clearAll.call(self, parent);
            };


            if (window.addEventListener) {
                window.addEventListener('keydown', self._onKeyDown, true);
                //for window resize
                window.addEventListener('resize', self._onResize, true);
            } else if (document.attachEvent) { //IE
                document.attachEvent('onkeydown', self._onKeyDown);
                //for window resize
                document.attachEvent('onresize', self._onResize);
            }

            if (duration > 0) {
                var tim = setTimeout(function () {
                    _clearAll.call(self, parent);
                }, duration * 1000);

            }



        }

    }



    /**
     * Clear all
     *
     * @api private
     * @method _clearAll
     * @param {Object} targetElement
     */
    function _clearAll(targetElement) {
        overlayLayer = document.querySelector('.introjs-overlay');
        //return if intro already completed or skipped
        if (overlayLayer == null) {
            return;
        }

        //for fade-out animation
        overlayLayer.style.opacity = 0;
        var tim = setTimeout(function () {
            if (overlayLayer.parentNode) {
                overlayLayer.parentNode.removeChild(overlayLayer);
            }
        }, 400);


        //remove floatingElement layers
        var floatingElementQuery = document.querySelector(".introjsFloatingElement");
        if (floatingElementQuery) {
            floatingElementQuery.parentNode.removeChild(floatingElementQuery);
        }

        //remove all helper layers
        var helperLayer = document.querySelector('.introjs-helperLayer');
        if (helperLayer) {
            helperLayer.parentNode.removeChild(helperLayer);
        }
        var referenceLayer = document.querySelector('.introjs-tooltipReferenceLayer');
        if (referenceLayer) {
            referenceLayer.parentNode.removeChild(referenceLayer);
        }
        //remove `introjs-showElement` class from the element
        var showElement = document.querySelector('.introjs-showElement');
        if (showElement) {
            showElement.className = showElement.className.replace(/introjs-[a-zA-Z]+/g, '').replace(/^\s+|\s+$/g, ''); // This is a manual trim.
        }
        //clean listeners
        if (window.removeEventListener) {
            window.removeEventListener('keydown', this._onKeyDown, true);
        } else if (document.detachEvent) { //IE
            document.detachEvent('onkeydown', this._onKeyDown);
        }
        //remove `introjs-fixParent` class from the elements
        var fixParents = document.querySelectorAll('.introjs-fixParent');
        if (fixParents && fixParents.length > 0) {
            for (var i = fixParents.length - 1; i >= 0; i--) {
                fixParents[i].className = fixParents[i].className.replace(/introjs-fixParent/g, '').replace(/^\s+|\s+$/g, '');
            };
        }


        this.stopRecursion = 1;
        this.currentStep = 0;
    }




    /**
     * Set the position of the root layers.
     *
     * @api private
     * @method _clearAll
     * @param {Object} targetElement
     */
    function _setHelperLayerPosition(helperLayer, currentItem) {
        if (helperLayer) {

            //prevent error when `this._currentStep` in undefined
            //if (!this._introItems[this._currentStep]) return;

            var elementPosition = _getOffset(currentItem),
                widthHeightPadding = 10;

            //set new position to helper layer
            helperLayer.setAttribute('style', 'width: ' + (elementPosition.width + widthHeightPadding) + 'px; ' +
                'height:' + (elementPosition.height + widthHeightPadding) + 'px; ' +
                'top:' + (elementPosition.top - 5) + 'px;' +
                'left: ' + (elementPosition.left - 5) + 'px;');


        }
    }


    /**
     * Add overlay layer to the page
     *
     * @api private
     * @method _addOverlayLayer
     * @param {Object} targetElm
     */
    function _addOverlayLayer(targetElm) {
        var overlayLayer = document.createElement('div'),
            styleText = '',
            self = this;

        //set css class name
        overlayLayer.className = 'introjs-overlay';

        //check if the target element is body, we should calculate the size of overlay layer in a better way
        if (targetElm.tagName.toLowerCase() === 'body') {
            styleText += 'top: 0;bottom: 0; left: 0;right: 0;position: fixed;';
            overlayLayer.setAttribute('style', styleText);
        } else {
            //set overlay layer position
            var elementPosition = _getOffset(targetElm);
            if (elementPosition) {
                styleText += 'width: ' + elementPosition.width + 'px; height:' + elementPosition.height + 'px; top:' + elementPosition.top + 'px;left: ' + elementPosition.left + 'px;';
                overlayLayer.setAttribute('style', styleText);
            }
        }

        targetElm.appendChild(overlayLayer);

        overlayLayer.onclick = function () {
            self.stopRecursion = 1;
            if (self.introductionStarted) {
                _stopIntoduction.call(self);
            } else {
                _clearAll.call(self, targetElm);
            }
        };

        var tim = setTimeout(function () {
            styleText += 'opacity: ' + self._options.overlayOpacity.toString() + ';';
            overlayLayer.setAttribute('style', styleText);
        }, 10);

        return true;
    }



    /**
     * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
     * via: http://stackoverflow.com/questions/171251/how-can-i-merge-properties-of-two-javascript-objects-dynamically
     *
     * @param obj1
     * @param obj2
     * @returns obj3 a new object based on obj1 and obj2
     */
    function _mergeOptions(obj1, obj2) {
        var obj3 = {};
        for (var attrname in obj1) {
            obj3[attrname] = obj1[attrname];
        }
        for (var attrname in obj2) {
            obj3[attrname] = obj2[attrname];
        }
        return obj3;
    }








    var introJSX = function (targetElm) {
        if (typeof (targetElm) === 'object') {
            //Ok, create a new instance
            return new IntroJSX(targetElm);

        } else if (typeof (targetElm) === 'string') {
            //select the target element with query selector
            var targetElement = document.querySelector(targetElm);

            if (targetElement) {
                return new IntroJSX(targetElement);
            } else {
                throw new Error('There is no element with given selector.');
            }
        } else {
            return new IntroJSX(document.body);
        }
    };



    /**
     * Current IntroJSX version
     *
     * @property version
     * @type String
     */
    introJSX.version = VERSION;
    //Prototype
    introJSX.fn = IntroJSX.prototype = {
        startIntro: function (selector, text, duration) {
            //_initializeElements.call(this, this._targetElement);            
            //_BadgeElement.call(this, this._targetElement, selector, text, duration);
            _startIntoduction.call(this);
            return this;
        },
        //showHint on a specific element , set it's text (1-2 chars) or leave it with the default value, 
        //set a duration in seconds, to make it disappear after that time. 
        showHint: function (selector, text, duration) {
            _BadgeElement.call(this, this._targetElement, selector, text, duration);
            return this;
        },
        showHint: function (selector) {
            _BadgeElement.call(this, this._targetElement, selector, this._options.defaultBadgeChar, this._options.defaultBadgeDuration);
            return this;
        },
        setOption: function (option, value) {
            this._options[option] = value;
            return this;
        },
        setOptions: function (options) {
            this._options = _mergeOptions(this._options, options);
            return this;
        }

    };
    exports.IntroJSX = introJSX;
    return introJSX;
}));
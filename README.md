# IntroJSX
An extended version of the known Intro.js

 2015 Dimitris Misdanitis

 Inspired and extended Afshin Mehrabani's (@afshinmeh) Intro.js

 Why to use IntoJSX /what differs from Intro.js:
 0) The "core" functions re-designed
 1) showHint (badge) functionality. When you just want to make the user notice something. No need to start an introduction!
 2) You can combine html and DOM introduction elements.
 3) Every introduction element has a property "duration" (in seconds). So the element will disappear after that time or it will go to the next step.
 4) autoPlay functionality. No need to click/press keys to go to the next step.
 5) You can dynamically append or replace a introduction element using JS.
 6) the _showElement function was messy, so re-written.
 7) Introduction element types: "tooltip", "badge" , "floating"
 8) Some ui improvements

 Downsides: No callbacks. Actually i don't need them now, maybe later.

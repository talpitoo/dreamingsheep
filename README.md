# [dreamingsheep](http://dreamingsheep.net/)

Excerpt from the [dreamingsheep](http://dreamingsheep.net/) template which is used as an example in my graduate thesis _"Automatization in the Web Application Front End Implementation"_.

![dreamingsheep](http://dreamingsheep.net/images/cover1200x630.jpg "dreamingsheep")


## Quick start

* Install [Virtual Box](https://www.virtualbox.org/).
* Install [Vagrant](https://www.vagrantup.com/).
* Clone the repo: `git clone https://github.com/talpitoo/dreamingsheep.git`.
* Go to the newly created folder: `cd dreamingsheep`.
* Start Vagrant: `vagrant up`.
* SSH to the newly created virtual machine: `vagrant ssh`.
* Go to the shared folder: `cd shared`.
* Install project dependencies: `bower install`.
* Build: `gulp`.
* Find the generated website in the `/dist` folder.
* Watch your changes: `gulp serve`.
* Open [localhost:9000](http://localhost:9000) on your host machine.
* If anything goes wrong, find help on [Stack Overflow](http://stackoverflow.com/).

Voilà!

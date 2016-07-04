# [littlelilly.no](http://littlelilly.no)

The Little Lilly website is a Jekyll website hosted at Netlify. It is possible to edit the content
visually through Siteleaf. The site is deployed automatically.

## Development

Development is done in feature branches that are merged into the develop branch through pull requests.

Content coming from Siteleaf is commited straight to the develop branch. Tiny fixed are also allowed straigh on the develop branch.

[dev.little.lilly](http://dev.littlelilly.no) is always in sync with the develop branch. 
The password is "littlelilly".

### Issues

Issues can be seen in a kanban board [using Huboard](https://huboard.com/lillylabs/little-lilly-website/).

When one is done working on an issue set it to "ready for next stage" so another team member can do the review step. Do not push an issues into the next lane. 

Frontend issues are often dependent on example content and this is a part of the ready step (maybe rename the ready lane at some point).


## Production

[littlelilly.no](http://littlelilly.no) is always in sync with the master branch.

### Minification etc.

Minification of resources and compression of images is done by Netlify. So no need for local minification processes.
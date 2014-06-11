GDC-API Examples
================

## Prerequisities

In order to run these examples you need to go through a few of simple steps:

- Install `Node.js`. Please see [Node.js official website for instructions](http://nodejs.org/)
- Install `Grunt.js`. Please see [Grunt.js official website for more instructions](http://gruntjs.com/getting-started)
- Check out GDC-API repo from github
- Switch to GDC-API folder
- Run `npm install`. This command will download all dependencies for GDC-API

You should now be able to run

	grunt test

And see that all the unit test are passing.

## Configuration

Next you need to create a JSON file containing your GoodData credentials. To do this, run

	grunt example-config --username <username> --password <password> --server <server> --domain <domain> --token <token>

`<server>`, `<token>` and `<domain>` are all optional parameters. `<server>` defaults to `secure.gooddata.com` and represents the endpoint. `<domain>` defaults to `null` and represents organization name within GoodData systems. `<token>` defaults to null and is needed when creating projects.

**Warning** You won't be able to run some examples without specifying a domain. Furthermore, you have to be a domain admin in order to create new GoodData users.

You should now find a JSON file in root directory of `examples/` directory called `config.json`.

## Running an example

To list all examples please run

    grunt list-examples

To run an example please run

	grunt run-example --example <filename>

where `<filename>` is a file name of example, without the `.js` extension or `examples/` folder name, e.g.

	grunt run-example --example 00_login

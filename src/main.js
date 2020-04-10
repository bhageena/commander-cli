/*
 * Nimbella CONFIDENTIAL
 * ---------------------
 *
 *   2018 - present Nimbella Corp
 *   All Rights Reserved.
 *
 * NOTICE:
 *
 * All information contained herein is, and remains the property of
 * Nimbella Corp and its suppliers, if any.  The intellectual and technical
 * concepts contained herein are proprietary to Nimbella Corp and its
 * suppliers and may be covered by U.S. and Foreign Patents, patents
 * in process, and are protected by trade secret or copyright law.
 *
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Nimbella Corp.
 */

const inquirer = require("inquirer");
const shell = require("shelljs");
const login = require("./login");
const chalk = require("chalk");
const figlet = require("figlet");
const open = require("open");
const terminalLink = require("terminal-link");
const renderResult = require("./render");

const init = () => {
  if (!shell.which("nim")) {
    shell.echo(
      "Commander CLI requires nim. " +
        "You can download and install it by running: " +
        "npm install -g https://apigcp.nimbella.io/nimbella-cli.tgz"
    );
    shell.exit(1);
  }

  console.log(
    chalk.green(
      figlet.textSync("Commander CLI", {
        horizontalLayout: "default",
        verticalLayout: "default",
      })
    )
  );
  console.log(
    "CLI which allows you to create, run & publish your serverless functions as commands\n"
  );
  const nimbella = terminalLink(
    "Presented to you by Nimbella",
    "https://nimbella.com"
  );
  console.log(nimbella);
  login.register(true);
};

const getHelp = () => {
  const helpOutput =
    "Some useful commands\n" +
    "General control: help    register     app_info\n" +
    "Command control: command_create <command-name>    command_list    command_info <command-name>\n" +
    "CSM control: csm_install <command-set>     csm_info <command-set>   csm_update <command-set>\n" +
    "Log control: app_log     command_log <command-name>  user_log <user-id>\n";

  return helpOutput;
};

const getCommand = () => {
  const commands = [
    {
      name: "COMMAND",
      type: "input",
      message: "nc>",
    },
  ];
  return inquirer.prompt(commands);
};

const runCommand = async command => {
  try {
    if (login.isFirstTimeLogin() && command !== "register") {
      console.log("Type register to start working on Commander");
      return null;
    }
    if (command === "?" || command === "help") {
      getHelp(command);
      return null;
    }

    if (command.startsWith("login")) {
      login.login(command.substring(command.indexOf(" ") + 1));
      return null;
    }

    if (command === "workbench") {
      open(login.getWorkbenchURL());
      return null;
    }

    if (command.startsWith("/nc")) {
      command = command.substring(command.indexOf(" ") + 1);
    } else if (command.startsWith("nim")) {
      shell.exec(command);
      return null;
    }

    if (command.startsWith("app_add") || command.startsWith("app_delete")) {
      console.log(
        "Sorry app addition/deletion is not supported in the cli mode"
      );
      return null;
    }

    const res = shell.exec(
      `nim action invoke ` +
        `--auth=3d4d42c1-700e-4806-a267-dc633c68d174:f1LSnYE61RuqMuHg4Ac8TlrNBrKjE5C0CO0Q5NQzscmSLOWMCf5jsXUKitgdnCi7` +
        ` /nc-dev/portal/gateway ` +
        ` --result -p __ow_headers "{\\"accept\\": \\"application/json\\", ` +
        `\\"content-type\\": \\"application/x-www-form-urlencoded\\",` +
        ` \\"user-agent\\": \\"commander-cli\\" }"` +
        ` -p command /nc -p team_domain commander-cli` +
        ` -p syncRequest \\"true\\" -p text \"${command}\"` +
        ` -p user_id ${login.getUser()} -p team_id ${login.getTeam()}`,
      { silent: true }
    );

    if (res.code) {
      // TODO: Log to a debug file
      shell.echo(res.stdout);
      return "Error: Failed to execute the command";
    }
    // TODO: Log stdout to a log file
    // console.log(res.stdout);
    return res.stdout;
  } catch (e) {
    // TODO: Log to a logfile
    // console.log(e);
    return "Error (check logs): " + e.message;
  }
};

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    if (["help", "--help", "-h"].includes(args[0])) {
      console.log(getHelp());
      process.exit();
    } else {
      login.register(false);
      const result = await runCommand(args.join(" "));
      renderResult(result);
    }
  } else {
    init();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const command = await getCommand();
      const { COMMAND } = command;
      if (!COMMAND) {
        continue;
      }
      const result = await runCommand(COMMAND);
      renderResult(result);
    }
  }
}

process.on("SIGINT", function () {
  console.log("Shutting down gracefully");
  process.exit();
});

main();

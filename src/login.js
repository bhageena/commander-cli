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

const chalk = require('chalk');
const workbenchURL = 'https://apigcp.nimbella.io/wb';

const {
  addCommanderData,
  getCredentials,
  fileSystemPersister,
} = require('nimbella-cli/lib/deployer');

const error = msg => ({ attachments: [{ color: 'danger', text: msg }] });

/**
 * Returns the client name based on the length of the token.
 * @param {string} token - The login token.
 * @returns {("slack"| "mattermost"|"teams"|"cli")} - The client name.
 */
const determineClient = token => {
  if (token.length === 19) {
    return 'slack';
  } else if (token.length === 53) {
    return 'mattermost';
  } else if (token.length === 127) {
    return 'teams';
  } else {
    return 'cli';
  }
};

const getUserCreds = async () => {
  const { namespace, ow } = await getCredentials(fileSystemPersister);
  const [username, password] = ow.api_key.split(':');
  return { username, password, namespace };
};

const setClientCreds = async (user, team, client) => {
  const { commander = { clients: {} }, ow, namespace } = await getCredentials(
    fileSystemPersister
  );
  commander.clients[user] = {
    username: user,
    password: team,
    client: client,
  };
  commander.currentClient = user;

  return await addCommanderData(
    ow.apihost,
    namespace,
    commander,
    fileSystemPersister
  );
};

const getClientCreds = async () => {
  const creds = await getCredentials(fileSystemPersister);

  return creds.commander.clients[creds.commander.currentClient];
};

const getClients = async () => {
  return (await getCredentials(fileSystemPersister)).commander.clients;
};

const setCurrentClient = async user => {
  const { commander, ow, namespace } = await getCredentials(
    fileSystemPersister
  );
  commander.currentClient = user;

  return await addCommanderData(
    ow.apihost,
    namespace,
    commander,
    fileSystemPersister
  );
};

const getAuth = async () => {
  const { username, password } = await getClientCreds();
  return username + ':' + password;
};

const login = async (args = []) => {
  const { prompt } = require('inquirer');

  const [arg] = args;
  if (args.length === 0) {
    const currentClient = await getClientCreds();
    const output = [
      `Currently used credentials:`,
      `User: ${currentClient.username}`,
      `Client: ${currentClient.client}`,
      '', // Empty line
    ];

    console.log(output.join('\n'));

    const clients = Object.values(await getClients());
    const choices = [];

    for (const client of clients) {
      choices.push({
        name: `${client.client} (${client.username.slice(0, 5)}...)`,
        value: client.username,
      });
    }

    try {
      const { userId } = await prompt([
        {
          type: 'list',
          name: 'userId',
          message: 'Select the account:',
          choices: choices,
        },
      ]);

      await setCurrentClient(userId);
      return {
        text: `Using ${userId} now.`,
      };
    } catch (err) {
      return error(err.message);
    }
  }

  const user = arg.slice(0, arg.lastIndexOf(':'));
  const password = arg.slice(arg.lastIndexOf(':') + 1);
  if (!user || !password) {
    return error(`Failed to extract login creds from: ${arg}`);
  }

  const client = determineClient(arg.trim());
  await setClientCreds(user, password, client);
  return { text: 'Logged in successfully to ' + chalk.green(client) };
};

const getWorkbenchURL = () => {
  return `${workbenchURL}?command=auth login` + ` --auth=${getAuth()}`;
};

const isFirstLogin = async () => {
  const { commander } = await getCredentials(fileSystemPersister);
  if (typeof commander === 'undefined') {
    return true;
  }

  return false;
};

module.exports = {
  login,
  getAuth,
  getWorkbenchURL,
  getUserCreds,
  setClientCreds,
  getClientCreds,
  setCurrentClient,
  isFirstLogin,
  getClients,
};

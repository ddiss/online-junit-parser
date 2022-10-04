(function(){

  function copyTextToClipboard(textArea) {
    textArea.focus();
    textArea.select();

    try {
      const success = document.execCommand('copy');
    } catch (err) {
      console.log('unable to copy');
    }
  }
  // to allow usage in onclick
  window.copyTextToClipboard = copyTextToClipboard;

  function parseTestcases(testcaseNodes) {
    return testcaseNodes.map(testcase => {
      const failure = testcase.querySelector('failure') ? testcase.querySelector('failure') : null;
      const skipped = testcase.querySelector('skipped') ? testcase.querySelector('skipped') : null;
      const error = testcase.querySelector('error') ? testcase.querySelector('error') : null;
      return {
        classname: testcase.getAttribute('classname'),
        name: testcase.getAttribute('name'),
        time: testcase.getAttribute('time') ? parseFloat(testcase.getAttribute('time'), 10) : null,
        skipped: skipped ? {
          message: skipped.getAttribute('message'),
        } : null,
        error: error && error.textContent ? error.textContent.trim() : '',
        failure: failure ? {
          message: failure.getAttribute('message'),
          type: failure.getAttribute('type'),
          content: failure.textContent ? failure.textContent.trim() : ''
        } : failure,
        systemOut: testcase.querySelector('system-out') ?  testcase.querySelector('system-out').textContent.trim() : '',
        systemErr: testcase.querySelector('system-err') ?  testcase.querySelector('system-err').textContent.trim() : '',
      };
    });
  }

  function parseTestsuite(testsuiteNodes) {
    return testsuiteNodes.map(testsuite => {
      const testcases = [...testsuite.querySelectorAll(':scope > testcase')];
      const testsuites = [...testsuite.querySelectorAll(':scope > testsuite')];
      return {
        id: testsuite.getAttribute('id'),
        name: testsuite.getAttribute('name'),
        package: testsuite.getAttribute('package'),
        hostname: testsuite.getAttribute('hostname'),
        disabled: testsuite.getAttribute('disabled') ? parseInt(testsuite.getAttribute('disabled'), 10) : null,
        failures: testsuite.getAttribute('failures') ? parseInt(testsuite.getAttribute('failures'), 10) : null,
        errors: testsuite.getAttribute('errors') ? parseInt(testsuite.getAttribute('errors'), 10) : null,
        skipped: testsuite.getAttribute('skipped') ? parseInt(testsuite.getAttribute('skipped'), 10) : null,
        tests: testsuite.getAttribute('tests') ? parseInt(testsuite.getAttribute('tests'), 10) : null,
        time: testsuite.getAttribute('time') ? parseFloat(testsuite.getAttribute('time'), 10) : null,
        timestamp: testsuite.getAttribute('timestamp') ? new Date(testsuite.getAttribute('timestamp')) : null,
        testcases: testcases.length ? parseTestcases(testcases) : [],
        testsuite: testsuites.length ? parseTestsuite(testsuites) : []
      };
    });
  }

  function parseTestsuites(testsuitesNodes) {
    return testsuitesNodes.map(testsuites => {
      const testcases = [...testsuites.querySelectorAll(':scope > testcase')];
      const testsuite = [...testsuites.querySelectorAll(':scope > testsuite')];
      return {
        id: testsuites.getAttribute('id'),
        name: testsuites.getAttribute('name'),
        tests: testsuites.getAttribute('tests') ? parseInt(testsuites.getAttribute('tests'), 10) : null,
        failures: testsuites.getAttribute('failures') ? parseInt(testsuites.getAttribute('failures'), 10) : null,
        errors: testsuites.getAttribute('errors') ? parseInt(testsuites.getAttribute('errors'), 10) : null,
        disabled: testsuites.getAttribute('disabled') ? parseInt(testsuites.getAttribute('disabled'), 10) : null,
        time: testsuites.getAttribute('time') ? parseFloat(testsuites.getAttribute('time')) : null,
        testsuite: testsuite.length ? parseTestsuite(testsuite) : [],
        testcases: testcases.length ? parseTestcases(testcases) : []
      };
    });
  }

  function convertToJson(xmlDoc) {
    const result = {
      testsuites: [],
      testsuite: [],
      testcases: []
    };
    const testsuitesNodes = [...xmlDoc.getElementsByTagName('testsuites')]
    if (testsuitesNodes && testsuitesNodes.length) {
      result.testsuites = parseTestsuites(testsuitesNodes);
    } else {
      const testsuiteNodes = [...xmlDoc.querySelectorAll(':scope > testsuite')];
      if (testsuiteNodes && testsuiteNodes.length) {
        result.testsuite = parseTestsuite(testsuiteNodes);
      }
      const testcaseNodes = [...xmlDoc.querySelectorAll(':scope > testcase')];
      if (testcaseNodes && testcaseNodes.length) {
        result.testcases = parseTestcases(testcaseNodes);
      }
    }
    return result;
  }

  function tplFail() {
    return `<span style="color: red">⛔</span>`;
  }

  function tplSuccess() {
    return `<span style="color: green">✅</span>`;
  }

  function tplResult(isFailing) {
    return isFailing ? tplFail() : tplSuccess();
  }

  function tpl(result) {
    return `
      ${result.testsuites ? result.testsuites.map(testsuites => `
        ${testsuites.name !== null ? `<h1>${testsuites.name}</h1>` : ''}
        <h2>
          ${testsuites.tests !== null ? `Tests: <b>${testsuites.tests}</b>,` : ''}
          ${testsuites.failures !== null ? `Failures: <b>${testsuites.failures}</b>,` : ''}
          ${testsuites.errors !== null ? `Errors: <b>${testsuites.errors}</b>,` : ''}
          ${testsuites.time ? `<em>Time: ${testsuites.time}</em>`: ''}
        </h2>
        ${tplTestsuite(testsuites.testsuite)}
      `).join('') : ''}
      ${result.testsuite ? tplTestsuite(result.testsuite) : ''}
      ${result.testcases ? tplTestcases(result.testcases) : ''}

    `
  }

  function isFailing(testObject) {
    const errorIsFailure = document.getElementById('settingErrorIsFailure').checked;
    if (testObject.failure && testObject.failures > 0) {
      return true;
    }
    if (errorIsFailure) {
      if (testObject.errors && testObject.errors > 0) {
        return true;
      }
      if (testObject.error && testObject.error.length) {
        return true;
      }
    }
    return false;
  }

  function tplTestsuite(testsuites) {
    return testsuites && testsuites.length ? `
      ${testsuites.map(testsuite => `
        <details>
          <summary>
            ${tplResult(isFailing(testsuite))}
            ${testsuite.name !== null ? ` <span class="testsuite-name" title="${testsuite.name}">${testsuite.name}</span>` : ''}
            ${testsuite.tests !== null ? `Tests: <b>${testsuite.tests}</b>,` : ''}
            ${testsuite.failures !== null ? `Failures: <b>${testsuite.failures}</b>,` : ''}
            ${testsuite.errors !== null ? `Errors: <b>${testsuite.errors}</b>,` : ''}
            ${testsuite.skipped !== null ? `Skipped: <b>${testsuite.skipped}</b>,` : ''}
            ${testsuite.time ? `<em>Time: ${testsuite.time}</em>`: ''}
          </summary>
          ${testsuite.testcases && testsuite.testcases.length ? `<div>${tplTestcases(testsuite.testcases)}</div>` : ''}
          ${testsuite.testsuite && testsuite.testsuite.length ? `<div style="margin-left: 1em">${tplTestsuite(testsuite.testsuite)}</div>` : ''}
          </details>
        `).join('')}
    ` :  '';
  }

  function tplTestcases(testcases) {
    return testcases && testcases.length ? `
      ${testcases.map(testcase => `
        <details style="margin-left: 1em">
          <summary>
            ${tplResult(isFailing(testcase))}
            <span class="testcase-name" title=" ${testcase.name ? testcase.name : ''} ${testcase.classname ? testcase.classname : ''}">
              ${testcase.name ? testcase.name : ''}
              ${testcase.classname ? testcase.classname : ''}
            </span>
            <em>${testcase.time}</em>
          </summary>
          <div style="margin-left: 1em">
            ${testcase.failure ? `
              <div>
                ${testcase.failure.type ? `<div>${testcase.failure.type}</div>` : ''}
                ${testcase.failure.message ? `<div>${testcase.failure.message}</div>` : ''}
                ${testcase.failure && testcase.failure.content && testcase.failure.content.length ? `
                  <div><b>Content:</b></div>
                  <div><pre>${testcase.failure.content}</pre></div>
                ` : ''}
              </div>
            ` : ''}
            ${testcase.error && testcase.error.length ? `
              <div><pre>${testcase.error}</pre></div>
            ` : ''}
            <div>
              ${testcase.systemOut && testcase.systemOut.length ? `
                <div><b>System-Out:</b></div>
                <div><pre>${testcase.systemOut}</pre></div>
              ` : ''}
              ${testcase.systemErr && testcase.systemErr.length ? `
                <div><b>System-Err:</b></div>
                <div><pre>${testcase.systemErr}</pre></div>
              ` : ''}
            </div>
          </div>
        </details>
      `).join('')}` : '';
  }

  function refresh(event) {
    const text = document.querySelector('textarea.xml').value;
    localStorage.setItem('xml', text);
    localStorage.setItem('settingErrorIsFailure',
      `${document.getElementById('settingErrorIsFailure').checked}`);
    parseText(text);
  }

  function processFile(evt) {
    if (evt.target.files.length < 1) {
      console.log('invalid files length: ' + evt.target.files.length);
      return;
    }
    const fr = new FileReader();
    fr.onload = (ev) => {
      document.querySelector('textarea.xml').value = ev.target.result;
      refresh();
    };
    fr.readAsText(evt.target.files[0]);
  }

  function parseText(text) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text.trim(),"text/xml");
    const resultAsJson = convertToJson(xmlDoc);
    document.querySelector('textarea.json').value = JSON.stringify(resultAsJson, null,2);
    document.querySelector('#result').innerHTML = tpl(resultAsJson);
    document.querySelector('textarea.html').value = document.querySelector('#result').innerHTML.trim();
  }

  function init() {
    document.querySelector('textarea.xml').addEventListener('change', refresh);
    document.querySelector('#settingErrorIsFailure').addEventListener('change', refresh);
    document.querySelector('#file').addEventListener('change', processFile);
    const settingErrorIsFailureStorage = localStorage.getItem('settingErrorIsFailure');
    const settingErrorIsFailur = false;
    if (settingErrorIsFailureStorage && settingErrorIsFailureStorage === 'true') {
      document.getElementById('settingErrorIsFailure').checked = true;
    }
    const lsXml = localStorage.getItem('xml');
    if (lsXml) {
      document.querySelector('textarea.xml').value = lsXml;
      parseText(lsXml);
    }
  }

  init();

})();
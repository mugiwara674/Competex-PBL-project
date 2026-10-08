/**
 * CompeteX Automated Verification & Testing Suite
 * Strictly adheres to Section 10.5 of the MBU PBL Technical Report
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('    CompeteX Automated System Verification & Test Suite');
  console.log('    MBU Web Technologies (22IT104001) - Quality Assurance');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      const start = Date.now();
      await fn();
      const duration = Date.now() - start;
      console.log(`  ✓ PASS: ${name} (${duration}ms)`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name} -> ${err.message}`);
    }
  }

  // 1. Core Server Health
  await test('Server HTTP 200 & Single-Page Application Host', async () => {
    const res = await request('GET', '/');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 2. Official PDF Report Hosting
  await test('Official MBU PBL Report PDF Download (/docs/CompeteX_PBL_Report.pdf)', async () => {
    const res = await request('GET', '/docs/CompeteX_PBL_Report.pdf');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 3. Competition Discovery Catalog
  await test('Competition Catalog Retrieval (/api/competitions)', async () => {
    const res = await request('GET', '/api/competitions');
    if (res.status !== 200 || !res.body.success || !Array.isArray(res.body.competitions)) {
      throw new Error('Invalid competitions response');
    }
  });

  // 4. CodeCraft Problems API
  await test('CodeCraft Algorithmic Problems Catalog (/api/coding/problems)', async () => {
    const res = await request('GET', '/api/coding/problems');
    if (res.status !== 200 || !res.body.success || !Array.isArray(res.body.problems)) {
      throw new Error('Problems catalog failed to load');
    }
  });

  // 5. CodeCraft Code Execution Sandbox
  await test('CodeCraft Execution Engine Runner (/api/coding/run)', async () => {
    const code = 'function twoSum(nums, target) { return [0, 1]; }';
    const res = await request('POST', '/api/coding/run', {
      problemId: 'prob-1',
      code: code,
      language: 'javascript'
    });
    if (res.status !== 200 || !res.body.success) throw new Error('Code execution failed');
  });

  // 6. BrainByte Quiz Questions
  await test('BrainByte Quiz Questions Retrieval (/api/quiz/questions)', async () => {
    const res = await request('GET', '/api/quiz/questions');
    if (res.status !== 200 || !res.body.success || !Array.isArray(res.body.questions)) {
      throw new Error('Quiz questions failed to load');
    }
  });

  // 7. BrainByte Automated Scoring
  await test('BrainByte Quiz Answer Evaluation (/api/quiz/submit)', async () => {
    const res = await request('POST', '/api/quiz/submit', {
      answers: [
        { questionId: 'q-1', selectedIndex: 1, timeRemainingSec: 20 },
        { questionId: 'q-2', selectedIndex: 1, timeRemainingSec: 15 }
      ]
    });
    if (res.status !== 200 || !res.body.success || typeof (res.body.grossScore ?? res.body.score) !== 'number') {
      throw new Error('Quiz evaluation failed');
    }
  });

  // 8. Platform Statistics & Leaderboards
  await test('Platform Analytics & Live Standings Stats (/api/stats)', async () => {
    const res = await request('GET', '/api/stats');
    if (res.status !== 200 || !res.body.success || !res.body.stats) {
      throw new Error('Stats API failed');
    }
  });

  // 9. Cryptographic Certificates API
  await test('Issued Certificates Roster & Validation Records (/api/certificates)', async () => {
    const res = await request('GET', '/api/certificates');
    if (res.status !== 200 || !res.body.success || !Array.isArray(res.body.certificates)) {
      throw new Error('Certificates API failed');
    }
  });

  // 10. Mentorship & Support Tickets
  await test('Mentorship Office Hours & Ticket Hub (/api/tickets)', async () => {
    const res = await request('GET', '/api/tickets');
    if (res.status !== 200 || !res.body.success || !Array.isArray(res.body.tickets)) {
      throw new Error('Tickets API failed');
    }
  });

  // 11. Event Schedule & Milestones
  await test('Event Schedule & Milestone Timeline (/api/schedule)', async () => {
    const res = await request('GET', '/api/schedule');
    if (res.status !== 200 || !res.body.success || !Array.isArray(res.body.schedules)) {
      throw new Error('Schedule API failed');
    }
  });

  // 12. Corporate Sponsor Bounty Board
  await test('Sponsors & Challenge Bounty Perks (/api/sponsors)', async () => {
    const res = await request('GET', '/api/sponsors');
    if (res.status !== 200 || !res.body.success || !Array.isArray(res.body.sponsors)) {
      throw new Error('Sponsors API failed');
    }
  });

  // 13. NAAC/NBA Accreditation Teams CSV
  await test('NAAC/NBA Teams Accreditation CSV Export (/api/export/teams)', async () => {
    const res = await request('GET', '/api/export/teams');
    if (res.status !== 200 || typeof res.body !== 'string' || !res.body.includes('Team Name')) {
      throw new Error('Teams CSV export format invalid');
    }
  });

  // 14. NAAC/NBA Accreditation Leaderboard CSV
  await test('NAAC/NBA Leaderboard CSV Export (/api/export/leaderboard)', async () => {
    const res = await request('GET', '/api/export/leaderboard');
    if (res.status !== 200 || typeof res.body !== 'string' || !res.body.includes('Rank')) {
      throw new Error('Leaderboard CSV export format invalid');
    }
  });

  // 15. NAAC/NBA Accreditation Certificates CSV
  await test('NAAC/NBA Certificates CSV Export (/api/export/certificates)', async () => {
    const res = await request('GET', '/api/export/certificates');
    if (res.status !== 200 || typeof res.body !== 'string' || !res.body.includes('Certificate Serial')) {
      throw new Error('Certificates CSV export format invalid');
    }
  });

  console.log('\n===============================================================');
  console.log(`    Audit Summary: ${passed}/${total} Tests Passed Successfully (${Math.round((passed/total)*100)}%)`);
  if (passed === total) {
    console.log('    Status: ALL SYSTEMS FULLY OPERATIONAL & ACADEMICALLY COMPLIANT');
  } else {
    console.log('    Status: Some tests failed. Please review the errors above.');
  }
  console.log('===============================================================\n');
}

runTestSuite().catch(err => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});

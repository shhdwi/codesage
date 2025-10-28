const { PrismaClient } = require('../app/generated/client');
const prisma = new PrismaClient();

async function addTestRepo() {
  try {
    // Get your installation ID from env
    const installationId = process.env.GITHUB_APP_ID || '2191270';
    
    // Create installation if it doesn't exist
    const installation = await prisma.installation.upsert({
      where: { githubId: BigInt(installationId) },
      update: {},
      create: {
        githubId: BigInt(installationId),
        owner: 'test-owner',
        ownerType: 'User',
      },
    });

    console.log(`Created/found installation: ${installation.id}`);

    // Prompt for repository
    const repoFullName = process.argv[2] || 'owner/repo-name';
    
    const repo = await prisma.repository.upsert({
      where: { fullName: repoFullName },
      update: {},
      create: {
        fullName: repoFullName,
        installationId: installation.id,
      },
    });

    console.log(`✅ Added repository: ${repo.fullName} (${repo.id})`);
    
    // List all repos
    const allRepos = await prisma.repository.findMany();
    console.log(`\nTotal repositories in database: ${allRepos.length}`);
    allRepos.forEach(r => console.log(`  - ${r.fullName}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addTestRepo();


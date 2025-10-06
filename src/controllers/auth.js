const db = require('../models');
const User = db.User;
// ...existing imports...

// Register: password will be hashed by model hook
async function register(req, res) {
	try {
		const { email, password, ...rest } = req.body;
		// ...validate input...
		const user = await User.create({ email, password, ...rest });
		// ...return created user (omit password)...
		return res.status(201).json({ id: user.id, email: user.email });
	} catch (err) {
		// ...existing error handling...
		return res.status(500).json({ error: 'Registration failed' });
	}
}

// Login: compare using model instance method
async function login(req, res) {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ where: { email } });
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });

		const isMatch = await user.comparePassword(password);
		if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

		// ...create and return JWT, etc...
		return res.json({ message: 'Authenticated', userId: user.id });
	} catch (err) {
		// ...existing error handling...
		return res.status(500).json({ error: 'Login failed' });
	}
}

module.exports = { register, login };

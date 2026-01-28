const express = require('express');
const router = express.Router();
const Location = require('../models/Location');

// GET /api/locations/districts - list of unique districts
router.get('/districts', async (req, res) => {
  try {
    const districts = await Location.distinct('district');
    districts.sort((a, b) => a.localeCompare(b));
    res.json({ success: true, districts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch districts' });
  }
});

// GET /api/locations/upazilas?district=DistrictName - upazilas for a district
router.get('/upazilas', async (req, res) => {
  try {
    const { district } = req.query;
    if (!district) {
      return res.status(400).json({ success: false, message: 'Missing district query parameter' });
    }
    const upazilas = await Location.find({ district }).distinct('upazila');
    const sorted = upazilas.sort((a, b) => a.localeCompare(b));
    res.json({ success: true, district, upazilas: sorted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch upazilas' });
  }
});

// GET /api/locations/all - grouped districts -> upazilas
router.get('/all', async (req, res) => {
  try {
    const locations = await Location.find({}, { district: 1, upazila: 1, _id: 0 });
    const grouped = locations.reduce((acc, { district, upazila }) => {
      acc[district] = acc[district] || [];
      acc[district].push(upazila);
      return acc;
    }, {});
    // sort upazilas
    Object.keys(grouped).forEach(d => grouped[d].sort((a, b) => a.localeCompare(b)));
    // sort districts
    const result = Object.keys(grouped).sort((a, b) => a.localeCompare(b)).map(d => ({ district: d, upazilas: grouped[d] }));
    res.json({ success: true, locations: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch locations' });
  }
});

module.exports = router;
